#!/usr/bin/env python3
"""
Script to populate the database with sample words for the word guessing game
Supports multiple languages including minority languages
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# Sample words for different languages
WORD_LISTS = {
    'en': [  # English
        'APPLE', 'BRAVE', 'CRANE', 'DREAM', 'EARTH', 'FLAME', 'GRACE', 'HEART',
        'IMAGE', 'JOKER', 'KNIFE', 'LIGHT', 'MUSIC', 'NIGHT', 'OCEAN', 'PEACE',
        'QUEEN', 'RAPID', 'STONE', 'TIGER', 'UNITY', 'VOICE', 'WATER', 'YOUTH',
        'MAGIC', 'POWER', 'STORM', 'TRADE', 'WORLD', 'PLANT', 'SMART', 'TRUST'
    ],
    'es': [  # Spanish
        'ABRIR', 'BUENO', 'CAMPO', 'DEBER', 'ENTRE', 'FORMA', 'GENTE', 'HASTA',
        'IGUAL', 'JUEGO', 'LARGO', 'MEJOR', 'NOCHE', 'ORDEN', 'PARTE', 'QUIEN',
        'REINO', 'SERIA', 'TARDE', 'ULTIMO', 'VERDE', 'ZONA'
    ],
    'fr': [  # French
        'AUTRE', 'BELLE', 'CHOSE', 'DEUX', 'ENFANT', 'FAIRE', 'GRAND', 'HOMME',
        'JOURS', 'LEVER', 'MONDE', 'NOTRE', 'PARLE', 'QUAND', 'RAISON', 'SEULE',
        'TEMPS', 'VIVRE', 'YEUX'
    ],
    'de': [  # German
        'ALLES', 'BEIDE', 'DAMIT', 'EINER', 'ERSTE', 'GEHEN', 'GROSS', 'HEUTE',
        'JETZT', 'KEINE', 'LANGE', 'MACHT', 'NICHT', 'SCHON', 'UNSER', 'VIELE',
        'WELT', 'ZEIT'
    ],
    'it': [  # Italian
        'ALTRE', 'AVERE', 'BELLO', 'DALLA', 'ESSERE', 'FATTO', 'GIORNO', 'GRANDE',
        'LUOGO', 'MOLTO', 'NUOVO', 'PARTE', 'PRIMA', 'QUALE', 'STESSO', 'TEMPO',
        'TUTTI', 'UOMO', 'VIENE'
    ],
    'pt': [  # Portuguese
        'AGORA', 'BAIXO', 'COISA', 'DEPOIS', 'ENTRE', 'FAZER', 'GRANDE', 'HOMEM',
        'LUGAR', 'MESMO', 'NOSSA', 'OUTRO', 'PARTE', 'PODE', 'TEMPO', 'TODO',
        'VIDA', 'VOLTA'
    ],
    'sw': [  # Swahili (minority language example)
        'JAMBO', 'HABARI', 'NZURI', 'RAFIKI', 'SAFARI', 'KITABU', 'MWANA',
        'SHULE', 'NYUMBA', 'CHAKULA', 'MAJI', 'MAMA', 'BABA'
    ],
    'ga': [  # Irish Gaelic (minority language example)
        'ABAIR', 'BEIRT', 'CEANN', 'DUINE', 'FOCAL', 'LEATH', 'TEACH'
    ]
}

async def populate_words():
    """Populate the database with sample words"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔤 Populating word database...")
    
    total_added = 0
    for language, words in WORD_LISTS.items():
        print(f"\n📚 Adding {language.upper()} words...")
        
        for word in words:
            # Check if word exists
            existing = await db.words.find_one({"word": word.lower(), "language": language})
            
            if not existing:
                doc = {
                    "id": f"{language}_{word.lower()}_{total_added}",
                    "word": word.lower(),
                    "language": language,
                    "difficulty": "medium",
                    "created_at": "2025-01-01T00:00:00"
                }
                await db.words.insert_one(doc)
                total_added += 1
                print(f"  ✅ Added: {word}")
            else:
                print(f"  ⏭️  Skipped (exists): {word}")
    
    print(f"\n✨ Database population complete! Added {total_added} new words.")
    
    # Show summary
    print("\n📊 Word counts by language:")
    for language in WORD_LISTS.keys():
        count = await db.words.count_documents({"language": language})
        print(f"  {language.upper()}: {count} words")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_words())
