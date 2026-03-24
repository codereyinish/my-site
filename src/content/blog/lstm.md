---
title: "LSTM"
description: "What actually is LSTM and how it differs from RNN network and how it can be used to identify human speech out of the background noise"
pubDate: 2026-03-23
heroImage: "/src/assets/blog/lstm-d0319ef7.png"
tags: ["AI", "Python", "Neural Network"]
---
## What is LSTM?

—> Long Short Term Memory.. Improved version of RNN 

Contains Cell state and hidden state between input windows

## LSTM

Long Short Term Memory

Imagine reading this sentence one word at a time, but forgetting each word the moment you move to the next:

```javascript
"The"    → read → forget
"cat"    → read → forget
"sat"    → read → forget
"on"     → read → forget
"the"    → read → forget
"mat"    → read → ???
```

```javascript
Present Transformer remember context among sentences, 
My name is Manish. I live in NY...
I ---> means Manish
here name padheko xaina, we forgot My 🤣. that is Regular Neural Network,


input → [neurons] → output
input → [neurons] → output   ← same network, no connection between steps
input → [neurons] → output
```




## Why we need LSTM in our  Classrec app?


we are doing Silero VAD detection for each 32ms sample …

```javascript
Window 1 (32ms): [sssss] ← start of "s" sound
LSTM: "sounds like start of consonant, storing..."
h = 0.2 (low confidence so far)


Window 2 Window 2 (32ms): [ppppp] ← "p" sound
LSTM: "another consonant, consonant cluster"
h = 0.4 (building confidence)

Here confidence increases due to previous input step , as a result more easy in 
detecting human audio or not

```



DO we need LSTM in image classification ?

No
  Images are not sequences. If we classify a CAT image , then it wont have any impact on image to be classified next..

   There's no "time" dimension, no before or after. 

```javascript
Image → CNN → classification
```

  How CNN works 

  Instead of looking at the whole image at once, CNN slides a small window pixel by pixel (called a filter or kernel) 

```javascript
Image (simplified 6x6):
┌─────────────┐
│ 0 0 1 1 0 0 │
│ 0 1 1 1 1 0 │
│ 1 1 0 0 1 1 │
│ 1 1 0 0 1 1 │
│ 0 1 1 1 1 0 │
│ 0 0 1 1 0 0 │
└─────────────┘

Filter (3x3) slides across:
┌───┐
│1 0│  ← detects vertical edges
│1 0│
└───┘
sliding → → →
         ↓ ↓ ↓
```

  How CNN learns and Classify image?

```javascript
Layer 1 — detects simple patterns:
  edges        corners      dots
   ─────         ┐           •
   ─────         │
   ─────

Layer 2 — combines simple patterns:
  curves       shapes      textures
    ╭─╮        △ □ ○       ░░░░
    ╰─╯                    ░░░░

Layer 3 — detects complex patterns:
  eyes         wheels       windows
   ◉            ◯            ▭

Final layer — full objects:
  cat face     car          building
```


CNN vs LSTM

```javascript
Data type          Structure        Use
─────────────────────────────────────────────
Image              2D spatial grid  CNN ✅
Audio (raw)        1D sequence      LSTM or CNN
Text               1D sequence      LSTM or Transformer
Video              3D (2D + time)   CNN + LSTM ✅ both
Time series        1D sequence      LSTM ✅
Speech detection   1D sequence      LSTM ✅ (Silero VAD)
```

Video is a sequence of image, so first image classification then LSTM to classify it by deriving context from the image..

Lets say classifying if a dog is moving..First we have to detect dog, and then on image snapshot ,we have to compare the relative position

```javascript
CNN asks:  "What patterns exist WHERE in this image?"
           spatial relationships matter
           ↓
           cat ears are always near the top
           wheels are always near the bottom

LSTM asks: "What happened BEFORE this moment?"
           temporal relationships matter
           ↓
           "sp" before "eech" = speech
           loud bang with no buildup = door slam
```

Do we still use LSTM and CNN after TRANSFORMER is popular?

—> yes for lightweight tasks

![](/src/assets/blog/lstm-7bef463e.png)





Back to LSTM

![](/src/assets/blog/lstm-c1705cdd.png)




```python
# Import it
from fastapi.staticfiles import StaticFiles

# Mount it to serve files from the static folder
app.mount("/static", StaticFiles(directory="static"), name="static")
#          ↓         ↓                     ↓              ↓
#       URL path   Class            Folder on disk    Name for URL building
```
