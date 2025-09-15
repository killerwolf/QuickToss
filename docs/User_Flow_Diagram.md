# QuickToss User Flow Diagram

```mermaid
flowchart TD
    A[App Launch] --> B[Welcome Screen]
    B --> C[Select Folder Button]
    C --> D[macOS Folder Picker]
    D --> E[User Selects Folder]
    E --> F[Scan Folder for Supported Files]
    F --> G{Any Supported Files?}
    
    G -->|No| H[Show No Files Message]
    H --> C
    
    G -->|Yes| I[Start File Review Session]
    I --> J[Display File Preview]
    J --> K[Show File Metadata]
    K --> L[Wait for User Action]
    
    L --> M{User Action}
    M -->|Swipe Left| N[Move to Trash]
    M -->|Swipe Right| O[Keep File]
    M -->|Undo| P[Reverse Last Action]
    
    N --> Q[Show Deleted Animation]
    O --> R[Show Kept Animation]
    P --> S[Restore Previous State]
    
    Q --> T{More Files?}
    R --> T
    S --> L
    
    T -->|Yes| U[Load Next File]
    U --> J
    
    T -->|No| V[Show Summary]
    V --> W[Files Deleted: X]
    V --> X[Files Kept: Y]
    V --> Y[Total Processed: Z]
    
    W --> Z1[Option to Review Deleted Files]
    X --> Z2[Option to Select Another Folder]
    Y --> Z1
    Y --> Z2
    
    Z1 --> AA[Review Deleted Files]
    Z2 --> C
    AA --> BB[Restore Selected Files]
    BB --> V
    
    %% Error Handling
    F --> CC{File Access Error?}
    CC -->|Yes| DD[Show Error Message]
    DD --> C
    
    J --> EE{Preview Generation Failed?}
    EE -->|Yes| FF[Show File Icon + Metadata]
    FF --> L
    
    J --> GG{Unsupported File Type?}
    GG -->|Yes| HH[Skip with Notification]
    HH --> T
    
    %% Styling
    classDef startEnd fill:#e1f5fe
    classDef process fill:#f3e5f5
    classDef decision fill:#fff3e0
    classDef action fill:#e8f5e8
    classDef error fill:#ffebee
    
    class A,V startEnd
    class B,C,D,E,F,I,J,K,L,U process
    class G,M,T,CC,EE,GG decision
    class N,O,P,Q,R,S,AA,BB action
    class H,DD,FF,HH error
```

## Gesture Mapping
- **Swipe Left (←)**: Delete file (move to Trash)
- **Swipe Right (→)**: Keep file (skip)
- **Tap**: Show more details (optional)
- **Undo**: Cmd+Z or dedicated button

## Visual Feedback
- **Swipe Left**: Red background, "DELETE" text
- **Swipe Right**: Green background, "KEEP" text
- **Loading**: Spinner or progress indicator
- **Completion**: Checkmark animation

## File Type Support
- **Images**: JPEG, PNG, GIF, HEIC, WebP
- **Documents**: PDF, TXT, RTF
- **Future**: Videos, Office docs, etc.
