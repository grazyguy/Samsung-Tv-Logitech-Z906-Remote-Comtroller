import "dotenv/config";

import express from "express";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


/* =========================================================
   PATHS
========================================================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/* =========================================================
   EXPRESS
========================================================= */

const app =
  express();

const PORT =
  process.env.PORT || 3000;


app.use(
  express.json({
    limit:"300kb"
  })
);


app.use(
  express.static(__dirname)
);


/* =========================================================
   OPENAI
========================================================= */

const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY
      })
    : null;


/* =========================================================
   APPLE MUSIC DEVELOPER TOKEN
========================================================= */

function createAppleMusicToken(){

  const teamId =
    process.env.APPLE_TEAM_ID;

  const keyId =
    process.env.APPLE_KEY_ID;

  const keyPath =
    process.env.APPLE_PRIVATE_KEY_PATH;


  if(
    !teamId ||
    !keyId ||
    !keyPath
  ){

    throw new Error(
      "Apple MusicKit ist nicht konfiguriert. APPLE_TEAM_ID, APPLE_KEY_ID und APPLE_PRIVATE_KEY_PATH fehlen."
    );

  }


  const absoluteKeyPath =
    path.resolve(
      __dirname,
      keyPath
    );


  if(
    !fs.existsSync(
      absoluteKeyPath
    )
  ){

    throw new Error(
      "Apple Private Key nicht gefunden: " +
      absoluteKeyPath
    );

  }


  const privateKey =
    fs.readFileSync(
      absoluteKeyPath,
      "utf8"
    );


  const now =
    Math.floor(
      Date.now() / 1000
    );


  /*
    Apple verlangt ES256.
    Wir erzeugen hier einen Token
    für 30 Tage.
  */

  const payload = {

    iss:
      teamId,

    iat:
      now,

    exp:
      now +
      60 *
      60 *
      24 *
      30

  };


  /*
    Optionaler Origin-Schutz.
  */

  const origin =
    process.env.APPLE_MUSIC_ORIGIN;


  if(origin){

    payload.origin =
      [
        origin
      ];

  }


  return jwt.sign(
    payload,
    privateKey,
    {
      algorithm:"ES256",

      header:{
        kid:keyId
      }
    }
  );

}


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req,res) => {

    res.json({

      ok:true,

      openai:
        !!process.env.OPENAI_API_KEY,

      appleMusic:
        !!(
          process.env.APPLE_TEAM_ID &&
          process.env.APPLE_KEY_ID &&
          process.env.APPLE_PRIVATE_KEY_PATH
        )

    });

  }
);


/* =========================================================
   APPLE MUSIC TOKEN
========================================================= */

app.get(
  "/api/apple-music-token",
  (req,res) => {

    try{

      const token =
        createAppleMusicToken();


      res.json({

        ok:true,

        token

      });


    }catch(error){

      console.error(
        "Apple Music Token:",
        error
      );


      res.status(503).json({

        ok:false,

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   AI DJ
========================================================= */

app.post(
  "/api/ai-dj",
  async (req,res) => {

    try{

      if(!openai){

        return res
          .status(503)
          .json({

            ok:false,

            error:
              "OPENAI_API_KEY fehlt."

          });

      }


      const response =
        await openai.responses.create({

          model:
            process.env.AI_MODEL ||
            "gpt-5.6",

          store:false,

          input:[

            {
              role:"developer",

              content:`

Du bist ein professioneller AI-DJ.

Du planst Übergänge zwischen Deck A und Deck B.

Berücksichtige:

- BPM
- Key
- Energie
- Gain
- EQ
- Bass-Swap
- Filter
- FX
- Loop
- Build-up
- Drop
- Übergangslänge
- Clipping
- Lautstärke

Vermeide extreme BPM-Sprünge.

Antworte ausschließlich als gültiges JSON.

Bevorzugtes Format:

{
  "explanation": "Kurze Erklärung",
  "transition": "Beschreibung des Übergangs",
  "steps": [
    "Schritt 1",
    "Schritt 2",
    "Schritt 3"
  ]
}

`

            },

            {
              role:"user",

              content:
                JSON.stringify(
                  req.body,
                  null,
                  2
                )

            }

          ]

        });


      let plan;


      try{

        plan =
          JSON.parse(
            response.output_text
          );

      }catch{

        plan = {

          explanation:
            response.output_text

        };

      }


      res.json({

        ok:true,

        plan

      });


    }catch(error){

      console.error(
        "AI DJ ERROR:",
        error
      );


      res.status(500).json({

        ok:false,

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "   SMART REMOTE • AI DJ"
    );
    console.log(
      "======================================"
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      "Apple Music:",
      process.env.APPLE_TEAM_ID
        ? "konfiguriert"
        : "NICHT konfiguriert"
    );

    console.log(
      "OpenAI:",
      process.env.OPENAI_API_KEY
        ? "konfiguriert"
        : "NICHT konfiguriert"
    );

    console.log(
      "======================================"
    );
    console.log("");

  }
);