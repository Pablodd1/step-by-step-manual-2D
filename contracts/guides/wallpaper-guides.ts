import { guideSchema, type Guide } from "../guide";

export const pasteTheWallGuide: Guide = guideSchema.parse({
  "schemaVersion": 1,
  "slug": "paste-the-wall",
  "title": "Paste-the-wall, from blank wall to final seam",
  "subtitle": "A measured 12-step installation for dry-hanging non-woven wallpaper.",
  "method": "paste-the-wall",
  "difficulty": "Careful beginner",
  "estimatedMinutes": 150,
  "people": 2,
  "description": "Prepare a sound wall, establish a true vertical, and hang dry drops into an even band of adhesive. The scene demonstrates sequence and hand movement; your wallcovering label remains the authority for adhesive, primer, match and drying.",
  "manufacturerNotice": "This is a generic learning guide, not a substitute for your product instructions. Adhesive type, sizing, booking, seam treatment, paint curing and drying time vary by wallcovering and manufacturer. Stop and follow the product label wherever it differs.",
  "pattern": {
    "name": "Canopy study",
    "repeatCm": 64,
    "match": "straight",
    "rollWidthCm": 52,
    "rollLengthCm": 1005
  },
  "steps": [
    {
      "id": "ptw-01",
      "title": "Read the label and inspect every roll",
      "shortTitle": "Check the rolls",
      "instruction": "Confirm the wallcovering is paste-the-wall, then check batch numbers, roll lengths, colour and print condition before cutting.",
      "detail": "Lay the rolls side by side in good light. Confirm the pattern repeat and match symbol, and keep the labels until the job is finished. If a defect or batch mismatch is visible, stop before hanging; the animation cannot assess your actual product.",
      "duration": 7,
      "tools": [
        "Tape measure"
      ],
      "materials": [
        "Wallpaper rolls",
        "Product labels"
      ],
      "warning": "Do not mix batch numbers without checking the manufacturer's allowance. Shade variation can become visible only after several drops are on the wall.",
      "narration": "Before opening the adhesive, verify that every roll is the intended paste-the-wall product. Check batch numbers, dimensions, pattern repeat and surface condition. Keep the labels and stop if anything is inconsistent.",
      "printCaption": "Verify product type, batches, dimensions and print condition before cutting.",
      "visual": {
        "action": "inspect",
        "tool": "tape",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            4.3,
            2.65,
            5.1
          ],
          "target": [
            0.2,
            0.8,
            0.8
          ]
        },
        "callout": "Batch · dimensions · repeat · match"
      },
      "sourceIds": [
        "grahamBrown",
        "york"
      ]
    },
    {
      "id": "ptw-02",
      "title": "Make the wall clean, dry and sound",
      "shortTitle": "Prepare the wall",
      "instruction": "Remove old covering and loose paint, repair defects, clean the surface and let all repairs and primer dry as their manufacturers require.",
      "detail": "The wall must be structurally sound and free of grease, mildew, dust and residual adhesive. Prime or size porous plaster and plasterboard with the system specified for your wallcovering. Treat moisture sources rather than covering them.",
      "duration": 8,
      "tools": [
        "Filler knife",
        "Sandpaper",
        "Clean cloth"
      ],
      "materials": [
        "Filler",
        "Specified primer or size"
      ],
      "warning": "Isolate electricity before removing switch or outlet plates. Do not cover damp, active mould or unsound plaster; correct the cause first.",
      "gate": {
        "title": "Surface and electrical safety gate",
        "body": "Continue only when the actual wall—not just the demonstration wall—is ready.",
        "checks": [
          "The wall is clean, dry, smooth and structurally sound.",
          "Paint, repairs, primer and size have cured for their own specified times.",
          "Power is isolated before any electrical plate is removed.",
          "Moisture or mould causes have been professionally resolved."
        ]
      },
      "narration": "Preparation determines adhesion. Remove loose material, repair the wall, clean it and allow every coating or repair to cure for its own specified time. Isolate power before removing electrical plates, and never cover an unresolved moisture problem.",
      "printCaption": "Clean, repair, dry and prime or size as specified; isolate power before plate removal.",
      "visual": {
        "action": "prepare",
        "tool": "sponge",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": true,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Clean · dry · sound · fully cured"
      },
      "sourceIds": [
        "wallcoverings",
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-03",
      "title": "Set out the complete tool station",
      "shortTitle": "Gather tools",
      "instruction": "Keep measuring, marking, pasting, smoothing, cutting and cleaning tools within reach before adhesive is mixed.",
      "detail": "Use a stable pasting or work table for measuring and cutting even though the wallcovering is hung dry. Protect the floor, keep a clean water supply, and use a stable platform rather than overreaching from furniture.",
      "duration": 6,
      "tools": [
        "Tape measure",
        "Pencil",
        "Plumb line or level",
        "Roller and tray",
        "Smoother",
        "Sharp knife",
        "Straightedge",
        "Seam roller",
        "Clean damp cloth"
      ],
      "materials": [
        "Specified paste",
        "Bucket",
        "Floor protection"
      ],
      "warning": "Use a sharp blade with a straightedge and a stable cutting surface. Keep blades and paste away from children and pets.",
      "narration": "Set out every tool before the paste is wet. You need tools for measuring, vertical marking, adhesive application, smoothing, trimming and cleaning. Protect the floor and make the work platform stable.",
      "printCaption": "Prepare a clean, stable station with all measuring, pasting, smoothing and trimming tools.",
      "visual": {
        "action": "tools",
        "tool": "bucket",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            4.3,
            2.65,
            5.1
          ],
          "target": [
            0.2,
            0.8,
            0.8
          ]
        },
        "callout": "Measure → paste → smooth → trim"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-04",
      "title": "Measure the wall and plan the drops",
      "shortTitle": "Plan the layout",
      "instruction": "Measure wall height in several places and use the greatest height plus trimming allowance; plan where the first and final drops will meet.",
      "detail": "Walls and ceilings are not always square. Mark each proposed roll-width across the wall, consider obstacles, and avoid finishing with an unmanageably narrow strip at a visible corner. Calculate repeat allowance from the product label rather than assuming a standard roll.",
      "duration": 7,
      "tools": [
        "Tape measure",
        "Pencil",
        "PLUMB calculator"
      ],
      "materials": [
        "Roll label",
        "Notepad"
      ],
      "narration": "Measure the wall height in several positions and plan from the greatest measurement plus trimming allowance. Mark roll widths to preview the layout, and use the actual product dimensions and repeat in the calculator.",
      "printCaption": "Measure at several heights, plan full-width drops and calculate with the actual roll label.",
      "visual": {
        "action": "measure",
        "tool": "tape",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Use maximum height + trim allowance"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-05",
      "title": "Strike a true vertical for the first drop",
      "shortTitle": "Mark plumb",
      "instruction": "Mark the first drop position from your layout, then use a level or plumb line to draw a vertical from ceiling to baseboard.",
      "detail": "Do not use a corner, door frame or ceiling line as proof of vertical. Position the line so the first drop can be aligned without forcing it into an out-of-square corner. This reference controls every following seam.",
      "duration": 6,
      "tools": [
        "Spirit level or plumb line",
        "Pencil",
        "Straightedge"
      ],
      "materials": [],
      "narration": "The first drop sets the accuracy of the entire wall. Establish its position from the layout and draw a true vertical with a level or plumb line. Never assume a room corner is straight.",
      "printCaption": "Use a level or plumb line—not the room corner—to establish the first vertical.",
      "visual": {
        "action": "mark",
        "tool": "level",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "True vertical, not the corner"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-06",
      "title": "Paste a band wider than one drop",
      "shortTitle": "Paste the wall",
      "instruction": "Apply the specified adhesive evenly to one drop-width of wall, extending a little beyond the width without flooding earlier seams.",
      "detail": "Use a roller for the main area and a brush at edges and obstacles. Follow the product's coverage and open-time instructions. Graham & Brown describes pasting a couple of centimetres wider than the drop; use your own product's direction if different.",
      "duration": 8,
      "tools": [
        "Roller and tray",
        "Paste brush"
      ],
      "materials": [
        "Specified wallpaper adhesive"
      ],
      "warning": "More adhesive is not automatically better. Avoid pooling, contamination and adhesive on finished faces; follow the specified coverage.",
      "narration": "Apply the specified adhesive evenly over one drop-width, extending slightly beyond the paper edge. Brush into boundaries and avoid dry misses or puddles. Work within the adhesive's stated open time.",
      "printCaption": "Roll an even adhesive band slightly wider than the drop; brush edges and avoid pooling.",
      "visual": {
        "action": "paste",
        "tool": "roller",
        "strips": 0,
        "activeStrip": 0,
        "paste": true,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Even coverage, just beyond the drop"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-07",
      "title": "Place the first dry drop to the plumb line",
      "shortTitle": "Hang drop one",
      "instruction": "Hang the wallcovering dry from the roll, align its edge to the vertical mark and leave trimming excess at top and bottom.",
      "detail": "Start at the top and let the roll down with control. The adhesive should allow gentle sliding into position. Keep the printed face clean and avoid trapping the roll or creasing the drop. A second person can support long lengths.",
      "duration": 8,
      "tools": [
        "Stepladder",
        "Second person for long drops"
      ],
      "materials": [
        "Dry wallpaper roll"
      ],
      "warning": "Do not overreach from a platform. Keep the roll supported and the walking area clear.",
      "narration": "Hang the first drop dry from the roll. Leave excess at the top and bottom, align the long edge to the plumb line, and slide gently into position. Support long drops with a second person.",
      "printCaption": "Align the dry first drop to plumb with controlled excess at ceiling and baseboard.",
      "visual": {
        "action": "place",
        "tool": "none",
        "strips": 1,
        "activeStrip": 0,
        "paste": true,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.5,
            3.75,
            4.25
          ],
          "target": [
            0,
            2.15,
            0
          ]
        },
        "callout": "Dry from the roll · align to plumb"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-08",
      "title": "Smooth from the centre outward",
      "shortTitle": "Smooth the drop",
      "instruction": "Work down the drop with the specified smoother, moving air and excess adhesive toward the edges without stretching the wallcovering.",
      "detail": "Use light, overlapping strokes and check the plumb edge as you go. If a bubble or misalignment remains, lift the affected area gently and re-smooth while the adhesive system allows repositioning.",
      "duration": 7,
      "tools": [
        "Wallpaper brush or smoother",
        "Clean damp cloth"
      ],
      "materials": [],
      "narration": "Smooth from the centre toward the edges and work downward. Use overlapping strokes without stretching the paper. Lift and re-lay a local section if a bubble or alignment problem remains.",
      "printCaption": "Smooth centre-out and downward; lift and re-lay locally if alignment or bubbles remain.",
      "visual": {
        "action": "smooth",
        "tool": "smoother",
        "strips": 1,
        "activeStrip": 0,
        "paste": true,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Centre → edges · top → bottom"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-09",
      "title": "Trim the ceiling and baseboard edges",
      "shortTitle": "Trim the edges",
      "instruction": "Form a clean crease at each boundary, hold a straightedge firmly and trim with a fresh sharp blade.",
      "detail": "Keep the blade controlled and change it before it begins tearing rather than slicing. Do not cut toward electrical fittings. Remove offcuts from the work area and keep the face free of adhesive.",
      "duration": 6,
      "tools": [
        "Sharp craft knife",
        "Metal straightedge",
        "Blade receptacle"
      ],
      "materials": [
        "Replacement blades"
      ],
      "warning": "Cut away from your body and keep the non-cutting hand clear of the blade path. Isolate power before work around electrical fittings.",
      "narration": "Crease the top and bottom boundaries, then trim against a firm straightedge with a fresh blade. Keep hands out of the cutting path and isolate power before trimming near electrical fittings.",
      "printCaption": "Crease and trim with a straightedge and fresh blade; keep hands clear of the cut.",
      "visual": {
        "action": "trim",
        "tool": "knife",
        "strips": 1,
        "activeStrip": 0,
        "paste": true,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": true,
        "outletSafe": false,
        "camera": {
          "position": [
            1.5,
            3.75,
            4.25
          ],
          "target": [
            0,
            2.15,
            0
          ]
        },
        "callout": "Fresh blade · firm straightedge"
      },
      "sourceIds": [
        "grahamBrown",
        "wallcoverings"
      ]
    },
    {
      "id": "ptw-10",
      "title": "Match the pattern and butt the next drops",
      "shortTitle": "Match the next drop",
      "instruction": "Paste the next wall band, slide the following dry drop until the pattern aligns, and close the seam according to the product instructions.",
      "detail": "Check both the design and the full seam before moving on. Butt seams where specified rather than overlapping by habit. Use a seam roller only if the wallcovering manufacturer permits it; delicate or embossed surfaces may require different handling.",
      "duration": 9,
      "tools": [
        "Roller",
        "Smoother",
        "Seam roller if specified",
        "Clean damp cloth"
      ],
      "materials": [
        "Specified adhesive",
        "Next dry drop"
      ],
      "narration": "For the next drop, align the design before smoothing the full length. Close the seam using the specified method, without forcing or stretching the paper. Check the complete seam before continuing.",
      "printCaption": "Match visually, hang the next dry drop and finish the seam only as the product specifies.",
      "visual": {
        "action": "match",
        "tool": "smoother",
        "strips": 2,
        "activeStrip": 1,
        "paste": true,
        "backing": false,
        "plumb": true,
        "patternMatch": true,
        "trim": true,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Align the design · close the seam"
      },
      "sourceIds": [
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-11",
      "title": "Work cleanly around openings and fittings",
      "shortTitle": "Work around obstacles",
      "instruction": "Mark the obstacle, make controlled relief cuts and trim only after the surrounding drop is aligned and smoothed.",
      "detail": "Turn off power before working at switches or outlets and remove plates only when safe. Do not let wet adhesive enter electrical boxes. At corners, use the product-appropriate method rather than forcing a full drop around an out-of-square turn.",
      "duration": 8,
      "tools": [
        "Pencil",
        "Scissors or knife",
        "Straightedge",
        "Voltage tester where appropriate"
      ],
      "materials": [],
      "warning": "The scene is not an electrical tutorial. If you are not competent to isolate and verify the circuit, use a qualified electrician.",
      "narration": "At openings and fittings, align the surrounding drop before making controlled relief cuts. Keep moisture out of electrical boxes and verify isolation before removing plates. Use a qualified electrician when necessary.",
      "printCaption": "Align first, then make controlled relief cuts; isolate power and keep adhesive out of boxes.",
      "visual": {
        "action": "cut",
        "tool": "knife",
        "strips": 3,
        "activeStrip": 2,
        "paste": true,
        "backing": false,
        "plumb": false,
        "patternMatch": true,
        "trim": true,
        "outletSafe": true,
        "camera": {
          "position": [
            -2.9,
            2.4,
            4.2
          ],
          "target": [
            -1.25,
            1.45,
            0
          ]
        },
        "callout": "Isolate · mark · relief-cut · trim"
      },
      "sourceIds": [
        "wallcoverings",
        "grahamBrown"
      ]
    },
    {
      "id": "ptw-12",
      "title": "Clean, inspect and let the installation dry",
      "shortTitle": "Final inspection",
      "instruction": "Remove adhesive residue with the approved cleaning method, inspect the full wall in raking light and allow the installation to dry undisturbed.",
      "detail": "Check every seam, edge and obstacle before replacing plates or moving furniture back. Keep room conditions within the manufacturer's range and avoid forcing heat onto the wall. Retain labels and a small offcut for future repair reference.",
      "duration": 7,
      "tools": [
        "Clean damp cloth",
        "Dry lint-free cloth",
        "Inspection light"
      ],
      "materials": [
        "Roll labels",
        "Repair offcut"
      ],
      "narration": "Clean residue using the approved method and inspect the entire wall from several angles. Allow the adhesive to dry under the specified room conditions, then replace fittings and retain the labels and a repair offcut.",
      "printCaption": "Clean, inspect all seams and edges, dry undisturbed and retain labels plus an offcut.",
      "visual": {
        "action": "check",
        "tool": "sponge",
        "strips": 5,
        "activeStrip": 4,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": true,
        "trim": true,
        "outletSafe": false,
        "camera": {
          "position": [
            4.8,
            3.25,
            6.8
          ],
          "target": [
            0,
            1.35,
            0
          ]
        },
        "callout": "Clean · inspect · dry undisturbed"
      },
      "sourceIds": [
        "grahamBrown",
        "york"
      ]
    }
  ],
  "sources": [
    {
      "id": "grahamBrown",
      "title": "How to hang wallpaper",
      "publisher": "Graham & Brown",
      "url": "https://www.grahambrown.com/us/how-to/hang-wallpaper/",
      "note": "Paste-the-wall tools, wall sizing, dry-drop placement, pattern matching and seam handling."
    },
    {
      "id": "wallcoverings",
      "title": "Surface preparation",
      "publisher": "Wallcoverings Association",
      "url": "https://www.wallcoverings.org/page/SurfacePrep",
      "note": "Clean, dry, structurally sound walls and electrical isolation before removing plates."
    },
    {
      "id": "york",
      "title": "Wallpaper installation guide",
      "publisher": "York Wallcoverings",
      "url": "https://yorkwallcoverings.com/pages/installation-guide",
      "note": "General preparation and manufacturer-led installation guidance."
    }
  ]
});

export const peelAndStickGuide: Guide = guideSchema.parse({
  "schemaVersion": 1,
  "slug": "peel-and-stick",
  "title": "Peel-and-stick, aligned without the rush",
  "subtitle": "A controlled 12-step installation with compatibility checks and small-section smoothing.",
  "method": "peel-and-stick",
  "difficulty": "Intermediate",
  "estimatedMinutes": 135,
  "people": 2,
  "description": "Test the actual surface, plan the panel sequence, expose only a small amount of adhesive and work downward with a helper. Seam overlap, approved paint finishes and cure times are product-specific inputs, not universal rules.",
  "manufacturerNotice": "Self-adhesive products differ substantially in surface compatibility, paint curing, panel overlap, repositioning, moisture suitability and removal. Follow your product label and technical sheet. Where this generic demonstration differs, the manufacturer wins.",
  "pattern": {
    "name": "Canopy study",
    "repeatCm": 64,
    "match": "straight",
    "rollWidthCm": 61,
    "rollLengthCm": 1005
  },
  "steps": [
    {
      "id": "pas-01",
      "title": "Confirm the wall and product are compatible",
      "shortTitle": "Test compatibility",
      "instruction": "Check the approved surface, paint finish, room conditions and paint-cure period, then install a test swatch where the manufacturer recommends one.",
      "detail": "Texture, contamination, moisture and some paint formulations can prevent adhesion. Do not convert one brand's curing rule into a universal number: use your paint and wallcovering instructions. Stop if the test fails or the wall remains damp or unsound.",
      "duration": 9,
      "tools": [
        "Product technical sheet",
        "Clean lint-free cloth"
      ],
      "materials": [
        "Test swatch",
        "Approved cleaning solution"
      ],
      "warning": "A successful short stick is not proof of long-term adhesion. Follow the full test duration and inspect removal behaviour where required.",
      "gate": {
        "title": "Product and surface compatibility gate",
        "body": "Self-adhesive wallpaper should not be used to bypass surface uncertainty.",
        "checks": [
          "The wall type, paint finish and room are approved for this exact product.",
          "The required paint or primer cure period has elapsed.",
          "Any specified adhesion test has passed for its full test period.",
          "The wall is dry, sound and free of active moisture or mould."
        ]
      },
      "narration": "Start with compatibility, not adhesion. Check that this exact product approves your wall, paint finish and room. Respect the specified curing and test periods, and stop if the wall or test swatch reveals a problem.",
      "printCaption": "Verify exact surface and paint compatibility; complete any specified adhesion test.",
      "visual": {
        "action": "inspect",
        "tool": "none",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Exact product · exact wall · test first"
      },
      "sourceIds": [
        "spoonflower",
        "wallcoverings"
      ]
    },
    {
      "id": "pas-02",
      "title": "Acclimate and inspect the panels",
      "shortTitle": "Acclimate the rolls",
      "instruction": "Let the material acclimate under the manufacturer's stated conditions and inspect colour, dimensions, print and panel order.",
      "detail": "Keep the material clean, dry and protected. For numbered or lettered murals, lay the sequence out before installation; for repeating designs, verify the match across rolls. Do not crease the printed face while unrolling.",
      "duration": 7,
      "tools": [
        "Clean flat work area",
        "Tape measure"
      ],
      "materials": [
        "Wallpaper rolls or labelled panels"
      ],
      "narration": "Acclimate the wallcovering under its specified room conditions. Inspect colour, scale and print condition, and lay out labelled mural panels in sequence. Keep the printed face free from creases.",
      "printCaption": "Acclimate as specified and inspect colour, dimensions, print and panel sequence.",
      "visual": {
        "action": "inspect",
        "tool": "tape",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            4.3,
            2.65,
            5.1
          ],
          "target": [
            0.2,
            0.8,
            0.8
          ]
        },
        "callout": "Acclimate · inspect · sequence"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-03",
      "title": "Prepare a smooth, clean, dry surface",
      "shortTitle": "Clean the wall",
      "instruction": "Remove old covering and hardware, repair defects and clean with only the method approved for your paint and wallcovering.",
      "detail": "Allow the wall to dry completely. Remove dust, grease and loose material, and correct moisture sources. Isolate electricity before removing switch or socket plates. Avoid improvised chemical cleaning that can leave a residue or damage paint.",
      "duration": 8,
      "tools": [
        "Approved cleaner",
        "Lint-free cloth",
        "Filler knife",
        "Sandpaper"
      ],
      "materials": [
        "Filler if required"
      ],
      "warning": "Disconnect the electricity source before removing electrical plates. Never work on a damp or actively mouldy wall.",
      "narration": "Prepare a smooth, clean and fully dry wall using approved cleaning materials. Repair defects and remove hardware. Isolate electricity before taking off electrical plates, and never cover damp or active mould.",
      "printCaption": "Repair and clean with approved materials; dry fully and isolate power before plate removal.",
      "visual": {
        "action": "prepare",
        "tool": "sponge",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": true,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Approved cleaner · fully dry wall"
      },
      "sourceIds": [
        "spoonflower",
        "wallcoverings"
      ]
    },
    {
      "id": "pas-04",
      "title": "Set out tools and arrange a second pair of hands",
      "shortTitle": "Gather your team",
      "instruction": "Prepare a hard smoother, sharp knife, straightedge, level, tape and stable platform; ask a helper to support the panel and backing.",
      "detail": "A helper keeps long panels from folding onto themselves and controls the removed liner. Use the smoother specified for the printed surface to avoid scratches. Keep the liner path and walking area clear.",
      "duration": 6,
      "tools": [
        "Hard smoother or squeegee",
        "Sharp knife",
        "Metal straightedge",
        "Level",
        "Tape measure",
        "Stepladder"
      ],
      "materials": [
        "Blade receptacle"
      ],
      "narration": "Arrange a helper before exposing adhesive. Set out the specified smoother, measuring tools, fresh blades and a stable platform. Keep the backing liner and walking area under control.",
      "printCaption": "Arrange a helper and prepare smoothing, measuring, cutting and access tools.",
      "visual": {
        "action": "tools",
        "tool": "squeegee",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            4.3,
            2.65,
            5.1
          ],
          "target": [
            0.2,
            0.8,
            0.8
          ]
        },
        "callout": "One aligns · one supports and smooths"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-05",
      "title": "Plan panel widths, repeats and the final join",
      "shortTitle": "Plan the panels",
      "instruction": "Measure the wall and choose a starting point that makes the first and final visual join as unobtrusive as possible.",
      "detail": "Use the tallest wall height for ordering where the manufacturer requires it, and plan the actual panel width rather than a generic roll width. Check the required seam treatment—butt or overlap—before cutting. Spoonflower, for example, specifies its own overlap; other products may differ.",
      "duration": 8,
      "tools": [
        "Tape measure",
        "Pencil",
        "PLUMB calculator"
      ],
      "materials": [
        "Panel labels",
        "Product technical sheet"
      ],
      "narration": "Plan using the actual panel width, height and pattern repeat. Choose a starting point that makes the final join less conspicuous, and confirm whether this product requires butt seams or an overlap.",
      "printCaption": "Plan real panel widths and pattern matching; confirm the specified seam treatment.",
      "visual": {
        "action": "measure",
        "tool": "tape",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Panel width · repeat · final join"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-06",
      "title": "Draw the first true vertical",
      "shortTitle": "Mark plumb",
      "instruction": "Use a level or plumb line to mark the alignment edge of the first panel, allowing any specified top excess.",
      "detail": "Do not align self-adhesive material to an assumed-square corner. Once adhesive touches the wall, repeated removal can contaminate or weaken it, so the reference line must be right before exposure.",
      "duration": 6,
      "tools": [
        "Level or plumb line",
        "Pencil"
      ],
      "materials": [],
      "narration": "Draw a true vertical for the first panel and plan the top excess. Avoid using the room corner as your reference. Careful marking reduces the need to peel and reposition later.",
      "printCaption": "Mark a true vertical and top excess before exposing any adhesive.",
      "visual": {
        "action": "mark",
        "tool": "level",
        "strips": 0,
        "activeStrip": 0,
        "paste": false,
        "backing": false,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.7,
            2.55,
            6.2
          ],
          "target": [
            0,
            1.5,
            0
          ]
        },
        "callout": "Mark first · expose adhesive second"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-07",
      "title": "Expose a small section and position the top",
      "shortTitle": "Position the top",
      "instruction": "Peel back only the manufacturer's recommended starter section of liner, crease the liner—not the printed face—and tack the top to your reference.",
      "detail": "Spoonflower demonstrates about 15 cm or 6 inches of exposed backing and 2.5–5 cm of top excess for its product. Treat these as brand examples, not universal dimensions. Keep the rest of the panel supported away from the wall.",
      "duration": 8,
      "tools": [
        "Second person",
        "Stepladder"
      ],
      "materials": [
        "First wallcovering panel"
      ],
      "warning": "Do not remove the entire liner at once. Keep adhesive away from dust, clothing and the printed face.",
      "narration": "Expose only the starter section recommended by your product. Crease the liner backwards, not the printed face. Position the top with the planned excess and keep the remaining panel supported.",
      "printCaption": "Expose a small starter section, position the top and support the rest of the panel.",
      "visual": {
        "action": "peel",
        "tool": "none",
        "strips": 1,
        "activeStrip": 0,
        "paste": false,
        "backing": true,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            1.5,
            3.75,
            4.25
          ],
          "target": [
            0,
            2.15,
            0
          ]
        },
        "callout": "Small exposed section · liner only creased"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-08",
      "title": "Smooth downward in small sections",
      "shortTitle": "Smooth downward",
      "instruction": "Begin near the centre and smooth outward while your helper removes more liner gradually, keeping the panel flat and aligned.",
      "detail": "Work in small, controlled bands rather than pulling the backing off in one movement. Use even pressure approved for the surface and avoid scratching or stretching. Watch the plumb edge and the pattern as each section is fixed.",
      "duration": 9,
      "tools": [
        "Hard smoother or squeegee",
        "Second person"
      ],
      "materials": [],
      "narration": "Smooth from the centre outward while the liner is removed gradually downward. Work in small sections with even pressure. Keep the panel flat and watch both alignment and air removal.",
      "printCaption": "Remove liner gradually and smooth centre-out in small controlled sections.",
      "visual": {
        "action": "smooth",
        "tool": "squeegee",
        "strips": 1,
        "activeStrip": 0,
        "paste": false,
        "backing": true,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Small bands · centre-out · downward"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-09",
      "title": "Reposition slowly if the product permits",
      "shortTitle": "Correct alignment",
      "instruction": "If alignment drifts, lift the affected section slowly while the adhesive and product instructions allow repositioning, then re-smooth.",
      "detail": "Do not yank a long fixed section or stretch the material to force a match. Repositionability is not unlimited and varies by product and wall finish. If adhesion or the printed surface is being damaged, stop and reassess.",
      "duration": 7,
      "tools": [
        "Second person",
        "Smoother"
      ],
      "materials": [],
      "warning": "Repeated peeling can contaminate adhesive or damage paint. Stop if the wall finish lifts or the panel distorts.",
      "narration": "When correction is needed, lift only the affected section slowly and reapply if your product permits it. Never stretch the panel to force alignment. Stop if paint lifts or the material distorts.",
      "printCaption": "Lift slowly and reapply only where permitted; never stretch to force a match.",
      "visual": {
        "action": "place",
        "tool": "none",
        "strips": 1,
        "activeStrip": 0,
        "paste": false,
        "backing": true,
        "plumb": true,
        "patternMatch": false,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Lift slowly · never stretch"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-10",
      "title": "Match and install the following panels",
      "shortTitle": "Match panel two",
      "instruction": "Align the design at eye level and across the full join, then install the next panel with the exact butt or overlap treatment specified.",
      "detail": "Keep the previous panel clean and avoid trapping liner between layers. Check colour consistency before fixing the full panel. An overlap shown in the scene is illustrative only; the product's printed technical sheet determines the real value.",
      "duration": 9,
      "tools": [
        "Second person",
        "Hard smoother",
        "Level"
      ],
      "materials": [
        "Following wallcovering panels"
      ],
      "narration": "Match the next panel to the design before fixing its full length. Use the exact butt or overlap method specified for the product, and check the join from top to bottom as you smooth.",
      "printCaption": "Align the full design join and apply only the specified butt or overlap treatment.",
      "visual": {
        "action": "match",
        "tool": "squeegee",
        "strips": 2,
        "activeStrip": 1,
        "paste": false,
        "backing": true,
        "plumb": true,
        "patternMatch": true,
        "trim": false,
        "outletSafe": false,
        "camera": {
          "position": [
            0.85,
            2.05,
            3.25
          ],
          "target": [
            0.12,
            1.55,
            0
          ]
        },
        "callout": "Match the full join · specified overlap"
      },
      "sourceIds": [
        "spoonflower"
      ]
    },
    {
      "id": "pas-11",
      "title": "Control corners, openings and final trimming",
      "shortTitle": "Trim and finish",
      "instruction": "Wrap or relieve corners using the product method, then trim boundaries with a straightedge and a fresh stable blade.",
      "detail": "Avoid cutting directly into an uneven internal corner if the manufacturer recommends wrapping a small amount first. Isolate power around electrical fittings and keep adhesive and tools out of boxes. Dispose of blades and liner safely; liner recyclability depends on material and local facilities.",
      "duration": 8,
      "tools": [
        "Sharp snap-off or craft knife",
        "Metal straightedge",
        "Smoother",
        "Blade receptacle"
      ],
      "materials": [
        "Replacement blades"
      ],
      "warning": "Keep the non-cutting hand out of the blade path. Isolate electricity before removing or refitting electrical plates.",
      "narration": "Control the material around corners and openings before final trimming. Use a straightedge and fresh blade at boundaries. Isolate power around fittings and dispose of blades and liner responsibly.",
      "printCaption": "Control corners, isolate power near fittings and trim with a fresh blade and straightedge.",
      "visual": {
        "action": "trim",
        "tool": "knife",
        "strips": 3,
        "activeStrip": 2,
        "paste": false,
        "backing": true,
        "plumb": false,
        "patternMatch": true,
        "trim": true,
        "outletSafe": true,
        "camera": {
          "position": [
            -2.9,
            2.4,
            4.2
          ],
          "target": [
            -1.25,
            1.45,
            0
          ]
        },
        "callout": "Control the corner · fresh blade"
      },
      "sourceIds": [
        "spoonflower",
        "wallcoverings"
      ]
    },
    {
      "id": "pas-12",
      "title": "Inspect the joins and finish the room",
      "shortTitle": "Final inspection",
      "instruction": "Check adhesion, joins, edges and obstacles in good light, deal with bubbles only by the approved method and replace fittings after isolation checks.",
      "detail": "Do not puncture or slit bubbles unless the manufacturer explicitly permits it. Keep the room within specified conditions and retain labels plus an offcut. If colour mismatch, adhesion failure or a product defect appears, stop and contact the supplier rather than hiding it with more panels.",
      "duration": 7,
      "tools": [
        "Inspection light",
        "Clean lint-free cloth"
      ],
      "materials": [
        "Product labels",
        "Repair offcut"
      ],
      "narration": "Inspect every join and edge in good light. Treat bubbles only with the method approved for your product, and stop if adhesion or colour problems appear. Replace fittings safely and retain labels and an offcut.",
      "printCaption": "Inspect joins and adhesion; use only approved bubble correction and retain repair material.",
      "visual": {
        "action": "check",
        "tool": "sponge",
        "strips": 5,
        "activeStrip": 4,
        "paste": false,
        "backing": false,
        "plumb": false,
        "patternMatch": true,
        "trim": true,
        "outletSafe": false,
        "camera": {
          "position": [
            4.8,
            3.25,
            6.8
          ],
          "target": [
            0,
            1.35,
            0
          ]
        },
        "callout": "Joins · adhesion · edges · fittings"
      },
      "sourceIds": [
        "spoonflower",
        "york"
      ]
    }
  ],
  "sources": [
    {
      "id": "spoonflower",
      "title": "How to install peel and stick wallpaper",
      "publisher": "Spoonflower",
      "url": "https://support.spoonflower.com/hc/en-us/articles/204279854-How-to-Install-Spoonflower-Peel-and-Stick-Wallpaper",
      "note": "Product-specific surface compatibility, acclimation, two-person installation, backing removal and smoothing sequence."
    },
    {
      "id": "wallcoverings",
      "title": "Surface preparation",
      "publisher": "Wallcoverings Association",
      "url": "https://www.wallcoverings.org/page/SurfacePrep",
      "note": "Clean, dry, structurally sound walls and electrical isolation before removing plates."
    },
    {
      "id": "york",
      "title": "Wallpaper installation guide",
      "publisher": "York Wallcoverings",
      "url": "https://yorkwallcoverings.com/pages/installation-guide",
      "note": "General preparation and manufacturer-led installation guidance."
    }
  ]
});

export const approvedWallpaperGuides: Guide[] = [pasteTheWallGuide, peelAndStickGuide];
