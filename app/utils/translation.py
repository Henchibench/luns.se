import re

class FoodTranslator:
    """Global English to Swedish food translation utility"""
    
    # Global translation dictionary for food terms
    TRANSLATIONS = {
        # Days
        'Monday': 'Måndag',
        'Tuesday': 'Tisdag', 
        'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag',
        'Friday': 'Fredag',
        'Closed': 'Stängt',
        
        # Proteins
        'chicken': 'kyckling',
        'pork': 'fläsk',
        'beef': 'nötkött',
        'veal': 'kalv',
        'cod': 'torsk',
        'haddock': 'kolja',
        'salmon': 'lax',
        'fish': 'fisk',
        'bacon': 'bacon',
        'meatloaf': 'köttfärslimpa',
        'kebab': 'kebab',
        'halloumi': 'halloumi',
        'shrimp': 'räkor',
        'prawns': 'räkor',
        'lamb': 'lamm',
        'turkey': 'kalkon',
        
        # Vegetables & sides
        'potato': 'potatis',
        'potatoes': 'potatis',
        'mashed potatoes': 'potatismos',
        'potato wedges': 'potatisklyftorr',
        'roasted potatoes': 'rostade potatisar',
        'broccoli': 'broccoli',
        'asparagus': 'sparris',
        'cabbage': 'kål',
        'onions': 'lök',
        'pickled onions': 'inlagd lök',
        'green peas': 'gröna ärtor',
        'zucchini': 'zucchini',
        'spinach': 'spenat',
        'carrots': 'morötter',
        'honey roasted carrots': 'honungsrostade morötter',
        'pickled beets': 'inlagda rödbetor',
        'peppers': 'paprika',
        'red pepper': 'röd paprika',
        'bamboo': 'bambu',
        'mushroom': 'svamp',
        'mushrooms': 'svamp',
        'chickpeas': 'kikärtor',
        'lentil': 'linser',
        'lentils': 'linser',
        'couscous': 'couscous',
        'beans': 'bönor',
        'tomato': 'tomat',
        'tomatoes': 'tomater',
        'cucumber': 'gurka',
        'lettuce': 'sallad',
        'avocado': 'avokado',
        
        # Grains & bread
        'rice': 'ris',
        'fried rice': 'stekt ris',
        'coconut rice': 'kokosris',
        'naan bread': 'naanbröd',
        'pasta': 'pasta',
        'bread': 'bröd',
        'quinoa': 'quinoa',
        'bulgur': 'bulgur',
        'noodles': 'nudlar',
        
        # Sauces & preparations
        'sauce': 'sås',
        'lemongrass sauce': 'citrongräs sås',
        'champagne sauce': 'champagnesås',
        'mushroom sauce': 'svampsås',
        'butter sauce': 'smörsås',
        'hollandaise': 'hollandaise',
        'tzatziki': 'tzatziki',
        'coconut milk': 'kokosmjölk',
        'clarified butter': 'klarat smör',
        'capers': 'kapris',
        'lingonberries': 'lingon',
        'berries': 'bär',
        'lime': 'lime',
        'lemon': 'citron',
        'cilantro': 'koriander',
        'coriander': 'koriander',
        'paprika': 'paprika',
        'seaweed caviar': 'tångkaviar',
        'grana padano': 'grana padano',
        'parmesan': 'parmesan',
        'cheese': 'ost',
        'hazelnuts': 'hasselnötter',
        'nuts': 'nötter',
        'cream': 'grädde',
        'garlic': 'vitlök',
        'herbs': 'örter',
        'dill': 'dill',
        'parsley': 'persilja',
        
        # Cooking methods
        'baked': 'bakad',
        'roasted': 'rostad',
        'grilled': 'grillad',
        'fried': 'stekt',
        'breaded': 'panerad',
        'pickled': 'inlagd',
        'spiced': 'kryddad',
        'wrapped': 'inbakad',
        'steamed': 'ångkokt',
        'sautéed': 'sauterad',
        'pan-seared': 'stekt i panna',
        'braised': 'bryserad',
        'smoked': 'rökt',
        'marinated': 'marinerad',
        
        # Dishes & styles
        'stew': 'gryta',
        'curry': 'curry',
        'buffet': 'buffé',
        'salad': 'sallad',
        'soup': 'soppa',
        'alfredo': 'alfredo',
        'piccata': 'piccata',
        'wallenbergare': 'wallenbergare',
        'dhal': 'dhal',
        'moqueca': 'moqueca',
        'thai red curry': 'thai röd curry',
        'relish': 'relish',
        'dressing': 'dressing',
        'burger': 'burgare',
        'sandwich': 'smörgås',
        'wrap': 'wrap',
        'pizza': 'pizza',
        'risotto': 'risotto',
        
        # Other
        'soy strips': 'sojastrimlar',
        'duchess': 'hertiginna',
        'vegan': 'vegansk',
        'vegetarian': 'vegetarisk',
        'scallion': 'salladslök',
        'fillet': 'filé',
        'organic': 'ekologisk',
        'fresh': 'färsk',
        'homemade': 'hemgjord',
        'seasonal': 'säsongs',
        'local': 'lokal',
        'wild': 'vild',
        'free-range': 'frigående'
    }
    
    @classmethod
    def translate(cls, text):
        """Translate English food terms to Swedish"""
        if not text:
            return text
            
        # Convert to lowercase for matching, but preserve original case structure
        text_lower = text.lower()
        translated = text_lower
        
        # Sort translations by length (longest first) to handle multi-word phrases first
        sorted_translations = sorted(cls.TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True)
        
        for english, swedish in sorted_translations:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(english.lower()) + r'\b'
            translated = re.sub(pattern, swedish, translated)
        
        # Capitalize first letter to match original format
        if translated and text[0].isupper():
            translated = translated[0].upper() + translated[1:] if len(translated) > 1 else translated.upper()
            
        return translated
    
    @classmethod
    def add_translation(cls, english_term, swedish_term):
        """Add a new translation to the global dictionary"""
        cls.TRANSLATIONS[english_term.lower()] = swedish_term.lower()
    
    @classmethod
    def get_coverage_stats(cls, text):
        """Get statistics on how much of the text was translated"""
        if not text:
            return {"total_words": 0, "translated_words": 0, "coverage": 0}
        
        words = text.lower().split()
        translated_count = 0
        
        for word in words:
            # Clean word of punctuation
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word in cls.TRANSLATIONS:
                translated_count += 1
        
        coverage = (translated_count / len(words) * 100) if words else 0
        
        return {
            "total_words": len(words),
            "translated_words": translated_count,
            "coverage": round(coverage, 1)
        } 