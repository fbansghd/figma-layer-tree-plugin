# Layer Tree for AI

Figma plugin to export layer structure for AI tools.

## Features

**Tree View**
```
Card (FRAME)
├── Header (GROUP)
│   ├── Avatar (ELLIPSE)
│   └── Title (TEXT)
└── Content (FRAME)
    └── Description (TEXT)
```

**JSON Export**
```json
{
  "name": "Card",
  "type": "FRAME",
  "width": 320,
  "height": 200,
  "cornerRadius": 8,
  "fills": [{"type": "SOLID", "color": "#FFFFFF"}],
  "autoLayout": {
    "direction": "VERTICAL",
    "gap": 16,
    "padding": {"top": 24, "right": 24, "bottom": 24, "left": 24}
  },
  "children": [...]
}
```

## Install

1. Download this repository
2. In Figma: Plugins → Development → Import plugin from manifest
3. Select `manifest.json`

## Usage

1. Select layers in Figma
2. Run the plugin
3. Click "Selection" for tree view or "Export JSON" for details
4. Copy and paste to your AI tool

## JSON Output Includes

- Size, position, rotation
- Colors (fills, strokes)
- Corner radius
- Auto Layout (direction, gap, padding, alignment)
- Text (font, size, line height, letter spacing)
- Effects (shadow, blur)
- Component info

## License

MIT
