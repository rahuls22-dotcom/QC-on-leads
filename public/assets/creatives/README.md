# Creative placeholders

Drop generated creative images into this folder using the IDs from
`DUMMY_CREATIVES` in `src/components/spot/workflow/workflow-pane.tsx`.

## Naming convention

`c01.png` ... `c12.png` — matches the `id` field of each dummy creative.

When a file exists at `/assets/creatives/{id}.png`, the assets canvas
loads it on top of the gradient placeholder. When the file is missing,
the gradient + headline overlay stays visible (the broken `<img>` is
hidden gracefully via `onError`).

## What each ID covers

| ID  | Persona                     | Angle           | Format | Channel  |
| --- | --------------------------- | --------------- | ------ | -------- |
| c01 | Working professional        | Outcome-led     | 1:1    | Meta     |
| c02 | Working professional        | Authority       | 4:5    | Meta     |
| c03 | Working professional        | Method          | 9:16   | Meta     |
| c04 | College student             | Outcome-led     | 1:1    | Meta     |
| c05 | College student             | Transformation  | 9:16   | Meta     |
| c06 | College student             | Method          | 4:5    | Meta     |
| c07 | Parent · buying for child   | Emotional       | 1:1    | Meta     |
| c08 | Parent · buying for child   | Social proof    | 4:5    | Meta     |
| c09 | Parent · buying for child   | Outcome-led     | 9:16   | Meta     |
| c10 | Working professional        | Trial-led       | 16:9   | YouTube  |
| c11 | College student             | Risk-reversal   | 16:9   | YouTube  |
| c12 | Working professional        | Positioning     | 1:1    | Meta     |

## Sizing tips

- `1:1`  · 1080×1080 px (Meta feed)
- `4:5`  · 1080×1350 px (Meta feed · portrait)
- `9:16` · 1080×1920 px (Reels / Stories)
- `16:9` · 1920×1080 px (YouTube)
