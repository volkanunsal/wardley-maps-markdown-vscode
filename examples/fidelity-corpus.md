# `cli-owm` fidelity corpus

Each `owm` fence below exercises one OWM DSL construct: pipelines (both syntax forms), submaps,
accelerators/deaccelerators, notes, annotations, evolved components with label offsets, the
pioneers/settlers/townplanners attitude boxes, custom `x-axis` labels, and all five render themes.
Use it as a manual-verification fixture — render every fence and compare against
onlinewardleymaps.com — or as a copy-paste starting point for your own maps.

Every construct here renders correctly except custom `y-axis` labels (example 10), which is a known,
documented limitation — see the README's "Known limitation" section. Example 10 still renders its map;
only the custom vertical-axis labels are dropped, and the fence gets an informational diagnostic
saying so.

## 01 — Base: Tea Shop

```owm
title Tea Shop
anchor Business [0.95, 0.63]
anchor Public [0.95, 0.78]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Cup [0.73, 0.78]
component Tea [0.63, 0.81]
component Hot Water [0.52, 0.80]
component Water [0.38, 0.82]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
Business->Cup of Tea
Public->Cup of Tea
Cup of Tea->Cup
Cup of Tea->Tea
Cup of Tea->Hot Water
Hot Water->Water
Hot Water->Kettle
Kettle->Power
```

## 02 — Pipeline, inline header form

```owm
title Tea Shop - pipeline (header form)
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
pipeline Kettle [0.20, 0.80]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 03 — Pipeline, `{ … }` block form

```owm
title Tea Shop - pipeline (block form)
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
pipeline Kettle
{
  component Campfire Kettle [0.22]
  component Stove Kettle [0.45]
  component Electric Kettle [0.63]
  component Instant Boiling Tap [0.86]
}
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 04 — Submap with a url

```owm
title Tea Shop - submap
anchor Business [0.95, 0.63]
submap Cup of Tea [0.79, 0.61] url(cupoftea)
url cupoftea [https://onlinewardleymaps.com/#clone:examplemap]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 05 — Accelerator and deaccelerator

```owm
title Tea Shop - accelerators
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
accelerator Market pressure [0.45, 0.40]
deaccelerator Regulation [0.15, 0.72]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 06 — Note and annotation

```owm
title Tea Shop - notes and annotations
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
note Standardising power [0.20, 0.20]
note +standard power [0.62, 0.72]
annotation 1 [[0.43,0.49],[0.08,0.29]] Standardising power allows Kettles to evolve faster
annotation 2 [0.48, 0.85] Hot water is obvious and well known
annotations [0.60, 0.02]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 07 — Evolved component with a label offset

```owm
title Tea Shop - evolve with label offset
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
evolve Kettle 0.62 label [16, 7]
component Power [0.1, 0.7] label [-27, 20]
evolve Power 0.89 label [-12, 21]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 08 — Pioneers / settlers / townplanners

```owm
title Tea Shop - attitudes
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
pioneers [0.62, 0.03, 0.79, 0.20]
settlers [0.45, 0.30, 0.62, 0.53]
townplanners [0.28, 0.62, 0.45, 0.85]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 09 — Custom x-axis labels (`evolution`)

```owm
title Tea Shop - custom x-axis
evolution Novel->Emerging->Good->Best
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 10 — Custom y-axis labels (`y-axis`) — KNOWN GAP

```owm
title Tea Shop - custom y-axis
y-axis Profit|Low|High
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61] label [19, -4]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35] label [-57, 4]
component Power [0.1, 0.7] label [-27, 20]
Business->Cup of Tea
Cup of Tea->Hot Water
Hot Water->Kettle
Kettle->Power
```

## 11 — All constructs together (theme sweep base)

Rendered once per theme: `plain`, `handwritten`, `wardley`, `dark`, `colour`.

```owm
title Tea Shop - everything
evolution Novel->Emerging->Good->Best
anchor Business [0.95, 0.63]
anchor Public [0.95, 0.78]
submap Cup of Tea [0.79, 0.61] url(cupoftea)
url cupoftea [https://onlinewardleymaps.com/#clone:examplemap]
component Cup [0.73, 0.78]
component Tea [0.63, 0.81]
component Hot Water [0.52, 0.80]
component Water [0.38, 0.82]
component Kettle [0.43, 0.35] label [-57, 4]
evolve Kettle 0.62 label [16, 7]
component Power [0.1, 0.7] label [-27, 20]
evolve Power 0.89 label [-12, 21]
pipeline Kettle
{
  component Campfire Kettle [0.22]
  component Electric Kettle [0.63]
}
accelerator Market pressure [0.45, 0.40]
deaccelerator Regulation [0.15, 0.72]
note Standardising power [0.20, 0.20]
annotation 1 [[0.43,0.49],[0.08,0.29]] Standardising power allows Kettles to evolve faster
annotation 2 [0.48, 0.85] Hot water is obvious and well known
annotations [0.60, 0.02]
pioneers [0.62, 0.03, 0.79, 0.20]
settlers [0.45, 0.30, 0.62, 0.53]
townplanners [0.28, 0.62, 0.45, 0.85]
Business->Cup of Tea
Public->Cup of Tea
Cup of Tea->Cup
Cup of Tea->Tea
Cup of Tea->Hot Water
Hot Water->Water
Hot Water->Kettle
Kettle->Power
```
