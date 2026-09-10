//! The two sounds a decision makes.
//!
//! Port of `src/sound.ts`, which built these with Web Audio oscillators. There
//! is no Web Audio here, so the same waveforms are synthesised into PCM once at
//! startup and handed to `NSSound` — which means no audio-engine dependency,
//! and no per-action allocation.

use crate::session::Decision;

const SAMPLE_RATE: f32 = 44_100.0;

/// Render both sounds to 16-bit mono WAV bytes.
///
/// Kept as data rather than files: they are a few kilobytes each, and
/// generating them keeps the sound design in readable code instead of in a
/// binary asset nobody can diff.
pub fn wav_for(decision: Decision) -> Vec<u8> {
    let samples = match decision {
        Decision::Toss => toss_samples(),
        Decision::Keep => keep_samples(),
    };
    encode_wav(&samples)
}

/// A descending whoosh — something being thrown away.
///
/// A sawtooth and a triangle sweeping down together, run through a lowpass
/// that closes as they fall. The filter is what makes it a whoosh rather than
/// a buzz, so it survives the port even though it costs a few lines.
fn toss_samples() -> Vec<f32> {
    let duration = 0.3;
    let count = (SAMPLE_RATE * duration) as usize;

    let mut saw_phase = 0.0f32;
    let mut tri_phase = 0.0f32;
    let mut lowpass = 0.0f32;

    (0..count)
        .map(|i| {
            let t = i as f32 / SAMPLE_RATE;
            let progress = t / duration;

            let saw_freq = sweep(300.0, 50.0, progress);
            let tri_freq = sweep(200.0, 30.0, progress);
            saw_phase = (saw_phase + saw_freq / SAMPLE_RATE).fract();
            tri_phase = (tri_phase + tri_freq / SAMPLE_RATE).fract();

            let saw = 2.0 * saw_phase - 1.0;
            let triangle = 4.0 * (tri_phase - 0.5).abs() - 1.0;

            // One-pole lowpass whose cutoff sweeps 800Hz -> 200Hz, matching the
            // BiquadFilterNode the Web Audio version swept.
            let cutoff = sweep(800.0, 200.0, progress);
            let alpha = (cutoff / SAMPLE_RATE).min(1.0);
            lowpass += alpha * ((saw + triangle) * 0.5 - lowpass);

            lowpass * decay(0.15, 0.01, progress)
        })
        .collect()
}

/// An ascending chime — a positive confirmation.
///
/// Three sines rising through a C major triad. The original also ran them
/// through a 400Hz highpass, which is transparent to content that starts at
/// C5 (523Hz), so it is left out rather than faithfully reproduced as a no-op.
fn keep_samples() -> Vec<f32> {
    let duration = 0.25;
    let sweep_duration = 0.2;
    let attack = 0.05;
    let count = (SAMPLE_RATE * duration) as usize;

    const VOICES: [(f32, f32); 3] = [
        (523.25, 659.25), // C5 -> E5
        (659.25, 783.99), // E5 -> G5
        (783.99, 1046.5), // G5 -> C6
    ];

    let mut phases = [0.0f32; 3];

    (0..count)
        .map(|i| {
            let t = i as f32 / SAMPLE_RATE;

            let mut sample = 0.0;
            for (voice, (start, end)) in VOICES.iter().enumerate() {
                let progress = (t / sweep_duration).min(1.0);
                let freq = sweep(*start, *end, progress);
                phases[voice] = (phases[voice] + freq / SAMPLE_RATE).fract();
                sample += (phases[voice] * std::f32::consts::TAU).sin();
            }
            sample /= VOICES.len() as f32;

            // Quick linear attack, then an exponential decay: a chime that
            // lands with the keypress rather than swelling after it.
            let envelope = if t < attack {
                0.12 * (t / attack)
            } else {
                let progress = (t - attack) / (duration - attack);
                decay(0.12, 0.01, progress)
            };

            sample * envelope
        })
        .collect()
}

/// Exponential ramp from `start` to `end` across `progress` in 0.0..=1.0 —
/// the shape `exponentialRampToValueAtTime` produced.
fn sweep(start: f32, end: f32, progress: f32) -> f32 {
    start * (end / start).powf(progress.clamp(0.0, 1.0))
}

fn decay(start: f32, end: f32, progress: f32) -> f32 {
    sweep(start, end, progress)
}

/// Minimal 16-bit mono PCM WAV. `NSSound` reads this happily and it saves
/// pulling in an encoder for what amounts to a 44-byte header.
fn encode_wav(samples: &[f32]) -> Vec<u8> {
    let data_len = (samples.len() * 2) as u32;
    let mut out = Vec::with_capacity(44 + data_len as usize);

    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes()); // PCM chunk size
    out.extend_from_slice(&1u16.to_le_bytes()); // format: PCM
    out.extend_from_slice(&1u16.to_le_bytes()); // channels: mono
    out.extend_from_slice(&(SAMPLE_RATE as u32).to_le_bytes());
    out.extend_from_slice(&((SAMPLE_RATE as u32) * 2).to_le_bytes()); // byte rate
    out.extend_from_slice(&2u16.to_le_bytes()); // block align
    out.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());

    for sample in samples {
        let clamped = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        out.extend_from_slice(&clamped.to_le_bytes());
    }

    out
}

#[cfg(target_os = "macos")]
pub use macos::Sounds;

#[cfg(target_os = "macos")]
mod macos {
    use super::{wav_for, Decision};
    use objc2::rc::Retained;
    use objc2::AllocAnyThread;
    use objc2_app_kit::NSSound;
    use objc2_foundation::NSData;

    /// Both sounds, decoded once and held for the life of the app. Replaying
    /// means stopping and starting the same object, so a fast run of decisions
    /// doesn't allocate a sound per keystroke.
    pub struct Sounds {
        toss: Option<Retained<NSSound>>,
        keep: Option<Retained<NSSound>>,
    }

    impl Sounds {
        pub fn load() -> Self {
            Self {
                toss: build(Decision::Toss),
                keep: build(Decision::Keep),
            }
        }

        /// Play the sound for a decision. Silently does nothing if the sound
        /// couldn't be created — audio feedback is a nicety, and losing it
        /// should never interrupt the actual work.
        pub fn play(&self, decision: Decision) {
            let sound = match decision {
                Decision::Toss => self.toss.as_ref(),
                Decision::Keep => self.keep.as_ref(),
            };

            if let Some(sound) = sound {
                // Rewind: without the stop, a second press while the first is
                // still ringing is ignored rather than retriggering.
                sound.stop();
                sound.play();
            }
        }
    }

    fn build(decision: Decision) -> Option<Retained<NSSound>> {
        let bytes = wav_for(decision);
        let data = NSData::with_bytes(&bytes);
        NSSound::initWithData(NSSound::alloc(), &data)
    }
}

#[cfg(not(target_os = "macos"))]
pub struct Sounds;

#[cfg(not(target_os = "macos"))]
impl Sounds {
    pub fn load() -> Self {
        Self
    }
    pub fn play(&self, _decision: Decision) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wav_has_a_riff_header_and_a_body() {
        let wav = wav_for(Decision::Keep);

        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert!(wav.len() > 44, "expected samples after the header");
    }

    #[test]
    fn samples_stay_inside_the_headroom_they_were_written_for() {
        // The envelopes peak at 0.15 (toss) and 0.12 (keep). Anything near 1.0
        // would mean a synthesis bug that clips on playback.
        for decision in [Decision::Toss, Decision::Keep] {
            let peak = match decision {
                Decision::Toss => toss_samples(),
                Decision::Keep => keep_samples(),
            }
            .into_iter()
            .fold(0.0f32, |peak, s| peak.max(s.abs()));

            assert!(peak > 0.0, "{decision:?} produced silence");
            assert!(
                peak <= 0.2,
                "{decision:?} peaked at {peak}, expected <= 0.2"
            );
        }
    }

    #[test]
    fn sweep_moves_between_its_endpoints() {
        assert!((sweep(300.0, 50.0, 0.0) - 300.0).abs() < 0.01);
        assert!((sweep(300.0, 50.0, 1.0) - 50.0).abs() < 0.01);
        // Exponential, so the midpoint is the geometric mean, not the average.
        assert!((sweep(100.0, 400.0, 0.5) - 200.0).abs() < 0.01);
    }
}
