/* Original scene artwork; messages and controls are live DOM layers. */
window.RavenSceneCatalog = [
  {
    "id": "diner",
    "label": "Diner booth window",
    "description": "Neon reflections, a menu board and a soda on the table.",
    "tags": [
      "Night",
      "Indoors"
    ],
    "image": "raven/scenes/diner.jpg",
    "thumbnail": "raven/scenes/diner-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        6,
        15,
        88,
        53
      ],
      "composer": [
        8,
        70,
        84,
        5.5
      ],
      "controls": [
        8,
        92.5,
        84,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "menu",
        "label": "Menu board",
        "bounds": [
          3,
          5.5,
          26,
          8.3
        ],
        "rotation": 0
      },
      {
        "id": "neon",
        "label": "Neon sign",
        "bounds": [
          74,
          5.3,
          23,
          6.5
        ],
        "rotation": 0
      },
      {
        "id": "cup-decal",
        "label": "Soda cup decal",
        "bounds": [
          86,
          84,
          7,
          5
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "train",
    "label": "Train / subway window",
    "description": "Station billboards and posters beyond the carriage glass.",
    "tags": [
      "Travel",
      "City"
    ],
    "image": "raven/scenes/train.jpg",
    "thumbnail": "raven/scenes/train-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        6,
        14,
        88,
        69
      ],
      "composer": [
        8,
        88,
        84,
        5.2
      ],
      "controls": [
        8,
        94,
        84,
        5.2
      ]
    },
    "surfaces": [
      {
        "id": "information",
        "label": "Carriage information display",
        "bounds": [
          23,
          6.2,
          54,
          2.7
        ],
        "rotation": 0
      },
      {
        "id": "route-map",
        "label": "Route map panel",
        "bounds": [
          8,
          92.5,
          10,
          5.8
        ],
        "rotation": 0
      },
      {
        "id": "station-poster",
        "label": "Station poster",
        "bounds": [
          76.8,
          41.4,
          10.5,
          11.3
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "airplane",
    "label": "Airplane window seat",
    "description": "Seatback display, window view and airport details.",
    "tags": [
      "Travel",
      "Indoors"
    ],
    "image": "raven/scenes/airplane.jpg",
    "thumbnail": "raven/scenes/airplane-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        9.5,
        16.5,
        66,
        45.5
      ],
      "composer": [
        9.5,
        63,
        66,
        5.4
      ],
      "controls": [
        18,
        84,
        76,
        6.5
      ]
    },
    "surfaces": [
      {
        "id": "gate-sign",
        "label": "Gate sign",
        "bounds": [
          94.5,
          32.2,
          4.4,
          1.8
        ],
        "rotation": 0
      },
      {
        "id": "seat-display",
        "label": "Seat control panel",
        "bounds": [
          16.5,
          73.8,
          65,
          3.4
        ],
        "rotation": 0
      },
      {
        "id": "cup-decal",
        "label": "Cup decal",
        "bounds": [
          0.6,
          74.3,
          8.1,
          4.2
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "city-night",
    "label": "City lights at night",
    "description": "Giant screens, storefront lights and a taxi-top display.",
    "tags": [
      "Night",
      "City"
    ],
    "image": "raven/scenes/city-night.jpg",
    "thumbnail": "raven/scenes/city-night-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        7,
        5,
        86,
        65
      ],
      "composer": [
        7,
        72,
        86,
        5.4
      ],
      "controls": [
        7,
        78.5,
        86,
        5.4
      ]
    },
    "surfaces": [
      {
        "id": "taxi-ad",
        "label": "Taxi-top display",
        "bounds": [
          69,
          85.2,
          13,
          2.2
        ],
        "rotation": 0
      },
      {
        "id": "storefront",
        "label": "Storefront sign",
        "bounds": [
          26,
          84.7,
          18,
          2.4
        ],
        "rotation": 0
      },
      {
        "id": "side-display",
        "label": "Side LED screen",
        "bounds": [
          94,
          9,
          5.4,
          28
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "bus-stop",
    "label": "Bus stop bench",
    "description": "A shelter display, route details and a passing bus.",
    "tags": [
      "City",
      "Outdoors"
    ],
    "image": "raven/scenes/bus-stop.jpg",
    "thumbnail": "raven/scenes/bus-stop-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        13,
        12,
        82,
        66
      ],
      "composer": [
        8,
        81.5,
        88,
        5
      ],
      "controls": [
        9,
        88,
        86,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "route-display",
        "label": "Route display",
        "bounds": [
          72,
          4,
          24,
          3.9
        ],
        "rotation": 0
      },
      {
        "id": "shelter-poster",
        "label": "Shelter poster",
        "bounds": [
          1.2,
          22,
          6.5,
          34
        ],
        "rotation": 0
      },
      {
        "id": "bus-ad",
        "label": "Passing bus advert",
        "bounds": [
          68,
          58,
          13,
          3.4
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "stadium",
    "label": "Stadium seats",
    "description": "A jumbotron, field banners and concessions.",
    "tags": [
      "Outdoors",
      "Entertainment"
    ],
    "image": "raven/scenes/stadium.jpg",
    "thumbnail": "raven/scenes/stadium-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        5,
        15,
        90,
        49.5
      ],
      "composer": [
        5,
        66,
        90,
        5.3
      ],
      "controls": [
        5,
        73,
        90,
        5.3
      ]
    },
    "surfaces": [
      {
        "id": "concession-sign",
        "label": "Concession stand sign",
        "bounds": [
          54,
          79.4,
          9.1,
          1.6
        ],
        "rotation": 0
      },
      {
        "id": "field-banner",
        "label": "Field-side banner",
        "bounds": [
          13,
          85.1,
          20,
          2.4
        ],
        "rotation": 0
      },
      {
        "id": "scoreboard-trim",
        "label": "Scoreboard information strip",
        "bounds": [
          7,
          73.1,
          86,
          4.4
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "boardwalk",
    "label": "Beach boardwalk",
    "description": "Ocean light, a banner plane, umbrellas and shop signs.",
    "tags": [
      "Outdoors",
      "Daylight"
    ],
    "image": "raven/scenes/boardwalk.jpg",
    "thumbnail": "raven/scenes/boardwalk-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        6,
        7,
        88,
        69
      ],
      "composer": [
        6,
        81.4,
        88,
        6.4
      ],
      "controls": [
        7,
        92,
        86,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "plane-banner",
        "label": "Airplane banner",
        "bounds": [
          68.1,
          22.1,
          14.1,
          1.7
        ],
        "rotation": 0
      },
      {
        "id": "surf-sign",
        "label": "Surf shop sign",
        "bounds": [
          3,
          50.1,
          12,
          3.2
        ],
        "rotation": 0
      },
      {
        "id": "ice-cream-sign",
        "label": "Ice-cream stand sign",
        "bounds": [
          88,
          53.4,
          5.6,
          5
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "cinema",
    "label": "Movie theater",
    "description": "The pre-show screen with popcorn and drinks nearby.",
    "tags": [
      "Indoors",
      "Entertainment"
    ],
    "image": "raven/scenes/cinema.jpg",
    "thumbnail": "raven/scenes/cinema-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        5,
        8,
        90,
        62
      ],
      "composer": [
        10,
        82.7,
        80,
        5.3
      ],
      "controls": [
        8,
        89,
        84,
        6
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Pre-show card",
        "bounds": [
          18,
          6,
          64,
          4
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Popcorn carton decal",
        "bounds": [
          0.5,
          85,
          10,
          7
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Drink cup decal",
        "bounds": [
          91.5,
          84,
          8,
          8
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "gas-station",
    "label": "Gas station at night",
    "description": "A pump display, store windows and the illuminated price sign.",
    "tags": [
      "Night",
      "Travel"
    ],
    "image": "raven/scenes/gas-station.jpg",
    "thumbnail": "raven/scenes/gas-station-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        12,
        13,
        76,
        60
      ],
      "composer": [
        21,
        79.5,
        59,
        5.5
      ],
      "controls": [
        7,
        94,
        86,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Price-sign display",
        "bounds": [
          94,
          27,
          5.5,
          6
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Store window sign",
        "bounds": [
          0,
          31,
          7,
          8
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Pump utility label",
        "bounds": [
          24,
          88,
          52,
          4
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "coffee-shop",
    "label": "Coffee shop window seat",
    "description": "Coffee cups, a chalkboard menu and street posters.",
    "tags": [
      "Daylight",
      "Indoors"
    ],
    "image": "raven/scenes/coffee-shop.jpg",
    "thumbnail": "raven/scenes/coffee-shop-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        13,
        8,
        81,
        57.2
      ],
      "composer": [
        8,
        69.5,
        88,
        5.5
      ],
      "controls": [
        8,
        75.5,
        84,
        5.8
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Chalkboard menu",
        "bounds": [
          0.6,
          17.5,
          8,
          31
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Posters across the street",
        "bounds": [
          80,
          39.6,
          15,
          7.4
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Coffee cup decal",
        "bounds": [
          2,
          82,
          12,
          4
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "elevator",
    "label": "Elevator",
    "description": "A wall display, floor indicator and posters.",
    "tags": [
      "Indoors",
      "City"
    ],
    "image": "raven/scenes/elevator.jpg",
    "thumbnail": "raven/scenes/elevator-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        8,
        11,
        84,
        56.5
      ],
      "composer": [
        6,
        72,
        82,
        6
      ],
      "controls": [
        7,
        83,
        86,
        6
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Floor indicator",
        "bounds": [
          40,
          3.5,
          20,
          3.2
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Wall notice area",
        "bounds": [
          10,
          90,
          36,
          3.5
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Right wall poster",
        "bounds": [
          97.5,
          24,
          2.5,
          28
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "food-court",
    "label": "Mall food court",
    "description": "Storefront signs, tables and kiosk displays.",
    "tags": [
      "Indoors",
      "City"
    ],
    "image": "raven/scenes/food-court.jpg",
    "thumbnail": "raven/scenes/food-court-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        16,
        8,
        68,
        65
      ],
      "composer": [
        6,
        90.5,
        88,
        5.2
      ],
      "controls": [
        8,
        80,
        84,
        5.8
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Bistro storefront sign",
        "bounds": [
          3,
          28,
          8,
          4
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Noodle storefront sign",
        "bounds": [
          89,
          30.5,
          9,
          4
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Kiosk lower display label",
        "bounds": [
          19,
          76.5,
          62,
          3
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "drive-in",
    "label": "Drive-in movie",
    "description": "The outdoor screen and a glowing snack shack.",
    "tags": [
      "Night",
      "Entertainment"
    ],
    "image": "raven/scenes/drive-in.jpg",
    "thumbnail": "raven/scenes/drive-in-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        5,
        12,
        90,
        56.5
      ],
      "composer": [
        6,
        88.6,
        88,
        5.5
      ],
      "controls": [
        6,
        94,
        88,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Snack-shack sign",
        "bounds": [
          89.5,
          74,
          8,
          1.7
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Pre-show title area",
        "bounds": [
          20,
          12,
          60,
          4
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Table ticket placard",
        "bounds": [
          4,
          86.2,
          24,
          2.5
        ],
        "rotation": 0
      }
    ]
  },
  {
    "id": "arcade",
    "label": "Arcade",
    "description": "Cabinet marquees, illuminated machines and a prize counter.",
    "tags": [
      "Indoors",
      "Entertainment"
    ],
    "image": "raven/scenes/arcade.jpg",
    "thumbnail": "raven/scenes/arcade-thumb.jpg",
    "dimensions": [
      887,
      1774
    ],
    "bounds": {
      "thread": [
        15,
        13,
        70,
        57
      ],
      "composer": [
        12,
        73.6,
        76,
        5.3
      ],
      "controls": [
        8,
        85.7,
        84,
        5.5
      ]
    },
    "surfaces": [
      {
        "id": "sign",
        "label": "Cabinet marquee",
        "bounds": [
          16,
          2,
          68,
          5.7
        ],
        "rotation": 0
      },
      {
        "id": "poster",
        "label": "Prize-counter sign",
        "bounds": [
          91.5,
          20.5,
          8,
          2.8
        ],
        "rotation": 0
      },
      {
        "id": "decal",
        "label": "Lower cabinet decal",
        "bounds": [
          20,
          92,
          55,
          4.5
        ],
        "rotation": 0
      }
    ]
  }
];
