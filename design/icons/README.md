# Icon sources

PWA icons are generated from these SVGs, not committed by hand.

```bash
cd public/assets
qlmanage -t -s 512 -o /tmp ../../design/icons/icon-source-any.svg
cp /tmp/icon-source-any.svg.png icon-512.png
sips -z 192 192 /tmp/icon-source-any.svg.png --out icon-192.png

qlmanage -t -s 512 -o /tmp ../../design/icons/icon-source-maskable.svg
cp /tmp/icon-source-maskable.svg.png icon-maskable-512.png
sips -z 192 192 /tmp/icon-source-maskable.svg.png --out icon-maskable-192.png

qlmanage -t -s 384 -o /tmp ../../design/icons/icon-source-shortcut-booking.svg
sips -z 96 96 /tmp/icon-source-shortcut-booking.svg.png --out shortcut-booking.png
```

`icon-source-any.svg` keeps the rounded-rect plate (manifest `purpose: "any"`).
`icon-source-maskable.svg` is full-bleed with the mark inside the 80% safe
circle (manifest `purpose: "maskable"`) — platforms crop it to their own shape.
