# App icons

Tauri expects bundled icons at the paths declared in `tauri.conf.json`:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Generate them in one shot from a square 1024×1024 source PNG:

```bash
cd desktop
npx @tauri-apps/cli icon ../assets/mi-lam-van-phong-banner.png
```

The CLI writes all variants into `src-tauri/icons/` automatically.
