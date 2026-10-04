// Generated from slm-rag/finetune/tool_schemas.json — do not hand-edit.
module.exports = {
  "get_hives": {
    "description": "List the beekeeper's hives with live health status.",
    "parameters": {
      "type": "object",
      "properties": {}
    },
    "write": false
  },
  "get_weather": {
    "description": "Local weather and climate context for the apiary.",
    "parameters": {
      "type": "object",
      "properties": {}
    },
    "write": false
  },
  "verify_jar": {
    "description": "Verify a honey jar's QR public key against the ledger chain.",
    "parameters": {
      "type": "object",
      "properties": {
        "hash": {
          "type": "string"
        }
      },
      "required": [
        "hash"
      ]
    },
    "write": false
  },
  "get_twin": {
    "description": "Trace a beekeeper's harvest journey (digital twin) by beekeeper id or block hash.",
    "parameters": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        }
      },
      "required": [
        "id"
      ]
    },
    "write": false
  },
  "predict_yield": {
    "description": "Formula-based honey yield estimate from sensor trends.",
    "parameters": {
      "type": "object",
      "properties": {
        "avgWeightGainKgPerWeek": {
          "type": "number"
        },
        "avgTempC": {
          "type": "number"
        },
        "avgHumidityPct": {
          "type": "number"
        },
        "season": {
          "type": "string"
        },
        "noOfColonies": {
          "type": "integer"
        },
        "weeksRemainingInSeason": {
          "type": "integer"
        }
      }
    },
    "write": false
  },
  "search_schemes": {
    "description": "Search KVIC/PMEGP/NBB scheme and eligibility reference cards.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string"
        },
        "language": {
          "type": "string"
        }
      },
      "required": [
        "query"
      ]
    },
    "write": false
  },
  "find_centre": {
    "description": "Find KVIC/Khadi/bee-institute centres near a city.",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string"
        }
      },
      "required": [
        "city"
      ]
    },
    "write": false
  },
  "get_my_blocks": {
    "description": "Personal ledger: caller's own journey (role-scoped server-side).",
    "parameters": {
      "type": "object",
      "properties": {}
    },
    "write": false
  },
  "log_extraction": {
    "description": "WRITE (beekeeper, confirm-gated): log a honey harvest as a honey_extraction block.",
    "parameters": {
      "type": "object",
      "properties": {
        "hive_id": {
          "type": "string"
        },
        "weight_kg": {
          "type": "number"
        },
        "flower_source": {
          "type": "string"
        },
        "date": {
          "type": "string"
        }
      },
      "required": [
        "hive_id",
        "weight_kg"
      ]
    },
    "write": true
  },
  "pool_lot": {
    "description": "WRITE (KVIC, confirm-gated): merge 2+ farmer harvest hashes into a cooperative lot.",
    "parameters": {
      "type": "object",
      "properties": {
        "prev_hashes": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 2
        }
      },
      "required": [
        "prev_hashes"
      ]
    },
    "write": true
  },
  "log_stage": {
    "description": "WRITE (KVIC, confirm-gated): append transport/processing/packaging/distribution/retail block.",
    "parameters": {
      "type": "object",
      "properties": {
        "stage": {
          "type": "string",
          "enum": [
            "transport",
            "processing",
            "packaging",
            "distribution",
            "retail"
          ]
        },
        "prev_hash": {
          "type": "string"
        },
        "data": {
          "type": "object"
        }
      },
      "required": [
        "stage",
        "prev_hash"
      ]
    },
    "write": true
  },
  "issue_sale": {
    "description": "WRITE (KVIC retail, confirm-gated): register a jar sale and issue verification key.",
    "parameters": {
      "type": "object",
      "properties": {
        "hash": {
          "type": "string"
        },
        "channel": {
          "type": "string",
          "enum": [
            "offline",
            "online"
          ]
        },
        "billNo": {
          "type": "string"
        },
        "orderId": {
          "type": "string"
        }
      },
      "required": [
        "hash",
        "channel"
      ]
    },
    "write": true
  },
  "file_rti": {
    "description": "WRITE (confirm-gated): file a Right-to-Information request about honey journey.",
    "parameters": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string"
        }
      },
      "required": [
        "text"
      ]
    },
    "write": true
  },
  "ask_clarify": {
    "description": "PSEUDO: required slots missing \u2014 ask the user for them.",
    "parameters": {
      "type": "object",
      "properties": {
        "missing": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "question": {
          "type": "string"
        }
      },
      "required": [
        "missing",
        "question"
      ]
    },
    "write": false
  },
  "refuse": {
    "description": "PSEUDO: request outside role or policy \u2014 refuse with explanation.",
    "parameters": {
      "type": "object",
      "properties": {
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "reason"
      ]
    },
    "write": false
  }
};
