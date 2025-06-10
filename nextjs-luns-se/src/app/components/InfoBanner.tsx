'use client';

import React, { useState, useEffect } from 'react';

interface InfoBannerProps {}

const goteborgJokes = [
  "Varför kan en abborre och en mört inte få barn? För det blir abbört.",
  "Vad kallas de som jobbar extra inom Folktandvården? Vikaries.",
  "Båtmässan borde slås ihop med MC-mässan och byta namn till? Skepp O'hoj.",
  "Dom som äter fikon för magens skull kommer ju? Skita på sig när de upptäcker Microlax.",
  "Vad heter Finlands sämsta bärplockare? Maski Hallonen.",
  "Efter att man har undertecknat skilsmässopapperen får man? Varsitt ex.",
  "Vad blir det om man lagar bilen på en söndag? Söndagsbilaga.",
  "Körde i diket och väntar spänt på bärgningsbilen? Kan knappt bärga mig.",
  "Vad heter Rysslands snabbaste korvstoppare? Korv-ba'-tjoff.",
  "Vilket är det vanligaste dubbelnamnet i Kenya? Kenny-Jan.",
  "Vad får man om man kapar benen av en gås? S, eftersom den inte längre kan gå.",
  "Hade pengar att placera, startade då en rodeo för att få? Mycket avkastning.",
  "4 hundar och 1 dog. Vad heter din jycke? AB+, det är en blodhund.",
  "Vad sa engelsmannen när han klev in på klippoteket för en klippning? Are you free Sir?",
  "Vad heter Läderlappens utblottade kusin? Fattiglappen.",
  "Brittisk radioprogram? Engelska kanalen.",
  "Vad heter Läderlappens rika kusin? Tusenlappen.",
  "Dom planerar att bygga en lekplats för äldre med fotproblem! Du skojar, vad ska den lekplatsen heta då? Gikta!",
  "Varför finns det inga spårvagnar i London? De tycker det är trams.",
  "Vad heter McDonalds nya fiskburgare? Mc-rill.",
  "Vad gör tandläkaren på lunchen? Käkar.",
  "Vilket djur är jordens största? Eeeen-orm.",
  "Vad heter det när katten bajsar utanför kattlådan? Kissemiss.",
  "Vad är det där för blandras som du går omkring med? Jo, jag hade en ångerfull schäfer som försökte göra en pudel.",
  "Kleptomaner bör inte jobba som minröjare? De kan inte skilja på mina och dina.",
  "Staten måste expandera fängelset för att det rymmer för lite.",
  "Orienterare säger att det är så härligt och fritt ute i naturen, men vafan, det är ju kontroller överallt!",
  "I Göteborg försöker man förbättra tandhälsan genom att lyssna på äldre kvinnors råd. Tantråd.",
  "Har du hört om kyrkvaktmästaren med koncentrationssvårigheter? Han hade grav ADHD.",
  "Vad gör The Boss när han får huvudvärk? Han tar ju Bruce-tabletter.",
  "Vad säger den våldsamma handkrämen till en jobbig människa? Ska du ha smörj eller?",
  "Vad sa kannibalen till göteborgaren? Är du goo eller?",
  "Varför serverar man sniglar på fina restauranger? Deras gäster tycker inte om snabbmat!",
  "Var lärde hajen sig att simma? Haj-school.",
  "Vad heter det när två göteborgare skiljer sig? Päron-Split.",
  "Arendal och Eriksberg är nedlagda, så nu finns bara Göteborgsvarvet kvar…",
  "Vad hade Zlatan hetat om han var från Göteborg? Zlatan Ibrahimordvits.",
  "Vart kommer du ifrån? Från Kanada. – Jaha, så du kan nada.",
  "Jag hade diarré sen gick jag till toaletten och sen var det löst.",
  "Varför heter det vagina och inte barnkanalen?",
  "Har koncentrationssvårigheterna ökat i Göteborg? A D H D!",
  "Vad säger frisören när du kommer på återbesök? Är du hair igen?",
  "Jag får inte te glöden på grillen! Du får la änna ringa ett kol-center!",
  "Jag skulle inte säga att jag är bäst i världen på kurragömma, men det är svårt att hitta någon som är bättre.",
  "Hur många fakturor har jag blivit av med nu? Har tappat räkningen igen.",
  "Varför läcker det från taket i hårsalongen? De har drop in.",
  "Vilket rockband har energisnålast ljusshow? LED Zeppelin.",
  "Varför är det bäst att lifta 12.59? Då kommer bilarna ett i ett.",
  "Vilket yrke är mest omväxlande? Elektriker, det är ju så ohmväxlande!",
  "Vem är den lille pojken med hudsalva i ansiktet? Det är min korte-son.",
  "Vad får man om man solar med BH? Vitlökar.",
  "Vad kallas en optiker man inte kan lita på? Ögontjänare.",
  "Varför är det så svårt att ha en kul utekväll i Riga? Dom har bara lett-öl.",
  "Du har ju för fan alla bokstavskombinationer… Ja, förutom I och Q då!",
  "På grund av de höga elpriserna har Electric Banana Band bytt namn till Acoustic Banana Band.",
  "Vad gjorde den pimpelfiskande tjecken när isen frös igen hela tiden? Han var käck och slo' vak igen.",
  "Vad är det för vatten i vattenpass? Rakvatten.",
  "En man började studera fåglar på universitetet. Han är nu Doktor And.",
  "Min australiske vän kan verkligen allting om vandringsskor. Han är en riktig kängguru.",
  "Jag blev sjuk till midsommarafton. Vilken miss-sommar.",
  "Dom som hjälper folk under pågående vulkanutbrott kan inte ha det lätt. Nä, det måste vara ett jevla lavarbete!",
  "Hörde ni om den skuldsatta dinosaurien? Levde på krita tydligen.",
  "Vad heter öringynglets mamma och pappa? Forelldrar.",
  "Vad kallas det när katten missar lådan? Kissemiss!",
  "Häromdagen var jag hos tandläkaren. Hade inga hål i tänderna men mellan…",
  "Vad kallar man de som kommer fram till ett övergångsställe, trycker på knappen och bara går? Tryckfelsnissar…",
  "Vart är min fönsterskrapa? Vet inte, den är puts väck.",
  "Vem ska man anlita om man vill fräscha upp väggarna? Ta Peter.",
  "Vad är det vanligaste dubbelnamnet på manliga bibliotekarier? Bo Ken.",
  "Varför sprider sig de kvinnliga könsorganen så okontrollerat? Det måste la vara en muttation!",
  "Vad händer när lakritsen tar slut i Göteborg? Då blir de La kris!",
  "Det var en engelsk kille som skulle gå och klippa sig och då sa han Are you free sir?",
  "Visste ni att Dracula hade en kusin som var vegan? Han hette Ruccola.",
  "Busschaufförerna har önskemål om toaletter på ändstationerna. Räcker det inte med hållplatser?",
  "På viktväktarnas hemsida frågar de om jag accepterar kakor. Är det en kuggfråga?",
  "Varför gick det så dåligt för Danmark i EM-kvalet? Kastrup.",
  "Babben Larsson startade en städfirma. Svabben Larsson.",
  "Tomten har slutat röka Oj då, då blir det inga tomtebloss i år…",
  "När firar bina jul? Trettondag jul. Då är julen förbi.",
  "När Viktväktarna gör reklam försöker de nå ut till den breda massan.",
  "Vad händer om ugglan tar av sig glasögonen? Den ser inte klok ut.",
  "Vill du ha kaffe får du säga te.",
  "Vilken krydda är gästvänligast? Kumm-in!",
  "Vilken är Påvens favoritglass? Romrussin.",
  "Vilken typ av kaffe gillar bönder? Kokaffe.",
  "Vilken typ av kaffe gillar hamnarbetare? Bryggkaffe.",
  "Vilket träd växer det pengar på? Plån-boken.",
  "Vad kallas hästskon i Göteborg? Gångjärn.",
  "Har du sett filmen om lastbilen? Nej, men jag har sett trailern.",
  "Vad kallas äldreboenden för män i Spanien? Señior-boende.",
  "Varför är det så många rullstolsbundna på golfbanan? De försöker minska sitt handicap.",
  "Varför köpa dyra guldfiskar när silverfiskar är helt gratis och otroligt lättskötta?",
  "Truten måste vara den mest musikaliska fågeln, för det är ju en Mozart.",
  "Smörsångare som sällan åker utomlands? Inrikes Iglesias.",
  "Vad kallar man en skilsmässa i Göteborg? En päron splitt.",
  "Vilken gata hör man sämst på i Göteborg? Övre Hursa.",
  "Varför är det farligt att äta för många halstabletter? Man kan hamna på mentolsjukhus.",
  "Vad äter en spådam en varm sommardag? Sia Glass.",
  "Varför fick skelettspecialisten sparken från sjukhuset? Han rönka på jobbet.",
  "Varför gick mjölken ut? Den blev sur.",
  "Vilket förvaringsutrymme är roligast? Kullager.",
  "Jag är nära släkt med en fågelskrämma. Den är min halmbror.",
  "Jag tänkte bjuda en zombie på middag. Jag lovar att han äter mer än hjärna…",
  "Vad säger man till en göteborgare som drar för många ordvitsar? Lägg av, du driver ju hela västkusten!",
  "Vad sa den ena kannibalen till den andra? E du go eller?",
  "Vad kallas en skilsmässa i Göteborg? Päronsplitt.",
  "Hur ser man att en bil är från Tyskland? Det german inte!",
  "Vilken stad bör man besöka om man har många båtar? Köp-en-hamn.",
  "Hur tar man med sig en hund genom tullen? Tax-free såklart!",
  "Vad heter Draculas veganska kusin? Ruccola.",
  "Hur många bor det i Tyskland? Göör-many.",
  "Vad sa den ena veggieburgaren till den andra? Soja, soja, inte gråta.",
  "Vad sa den brittiske sjökaptenen när han föll överbord? Han talar ju engelska flytande!",
  "Vad kallas en groda utan ben? Hopplös."
];

function getWeekNumber(): number {
  const date = new Date();
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
  return Math.ceil(dayDiff / 7) + 1;
}

function getLunchCountdown(): string {
  const now = new Date();
  const currentDay = now.getDay();
  
  let targetTime: Date;
  let daysToAdd = 0;
  
  if (currentDay === 0) { // Sunday
    daysToAdd = 1;
  } else if (currentDay === 6) { // Saturday
    daysToAdd = 2;
  } else { // Monday-Friday
    const todayLunchTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
    if (now <= todayLunchTime) {
      targetTime = todayLunchTime;
    } else {
      if (currentDay === 5) { // Friday
        daysToAdd = 3;
      } else {
        daysToAdd = 1;
      }
    }
  }
  
  if (daysToAdd > 0) {
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 11, 30, 0);
  }
  
  const diff = targetTime!.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    if (days === 1) {
      return `Nu har du 1 dag, ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
    } else {
      return `Nu har du ${days} dagar, ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
    }
  } else if (hours > 0) {
    return `Nu har du ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
  } else if (minutes > 0) {
    return `Nu har du ${minutes} minuter på dig att bestämma luns`;
  } else {
    return "Dags att bestämma luns nu nu nu!";
  }
}

export default function InfoBanner({}: InfoBannerProps) {
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [joke, setJoke] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('--°C');
  const [weatherCondition, setWeatherCondition] = useState<string>('');

  // Function to get weather emoji and description from WMO weather code
  const getWeatherInfo = (weatherCode: number) => {
    const weatherMap: { [key: number]: { emoji: string; description: string } } = {
      0: { emoji: '☀️', description: 'Klart' },
      1: { emoji: '🌤️', description: 'Mestadels klart' },
      2: { emoji: '⛅', description: 'Delvis molnigt' },
      3: { emoji: '☁️', description: 'Molnigt' },
      45: { emoji: '🌫️', description: 'Dimma' },
      48: { emoji: '🌫️', description: 'Rimfrost' },
      51: { emoji: '🌦️', description: 'Lätt duggregn' },
      53: { emoji: '🌦️', description: 'Duggregn' },
      55: { emoji: '🌧️', description: 'Kraftigt duggregn' },
      61: { emoji: '🌧️', description: 'Lätt regn' },
      63: { emoji: '🌧️', description: 'Regn' },
      65: { emoji: '🌧️', description: 'Kraftigt regn' },
      71: { emoji: '🌨️', description: 'Lätt snöfall' },
      73: { emoji: '❄️', description: 'Snöfall' },
      75: { emoji: '❄️', description: 'Kraftigt snöfall' },
      80: { emoji: '🌦️', description: 'Regnskurar' },
      81: { emoji: '🌧️', description: 'Kraftiga regnskurar' },
      95: { emoji: '⛈️', description: 'Åska' },
      96: { emoji: '⛈️', description: 'Åska med hagel' }
    };
    
    return weatherMap[weatherCode] || { emoji: '🌡️', description: '' };
  };

  useEffect(() => {
    // Set week number
    setCurrentWeek(getWeekNumber());
    
    // Set random joke
    const randomJoke = goteborgJokes[Math.floor(Math.random() * goteborgJokes.length)];
    setJoke(randomJoke);
    
    // Update countdown immediately and then every minute
    const updateCountdown = () => setCountdown(getLunchCountdown());
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);
    
    return () => {
      clearInterval(countdownInterval);
    };
  }, []);

  // Lazy load weather after main content loads
  useEffect(() => {
    const getWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=57.7059&longitude=11.9359&current_weather=true&timezone=Europe/Stockholm');
        const data = await response.json();
        
        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const weatherCode = data.current_weather.weathercode;
          const weatherInfo = getWeatherInfo(weatherCode);
          
          setTemperature(`${temp}°C`);
          setWeatherCondition(`${weatherInfo.emoji} ${weatherInfo.description}`);
        }
      } catch (error) {
        console.log('Weather API error:', error);
        setTemperature('--°C');
        setWeatherCondition('🌡️');
      }
    };

    // Delay weather fetch by 500ms to not block main content
    const weatherTimer = setTimeout(getWeather, 500);
    
    return () => {
      clearTimeout(weatherTimer);
    };
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Week Number & Weather Combined */}
        <div className="flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">📅 Vecka {currentWeek}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{weatherCondition || '🌡️'} {temperature}</div>
          </div>
        </div>

        {/* Göteborg Joke */}
        <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <span className="text-2xl mr-2 flex-shrink-0">🤭</span>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
            {joke}
          </div>
        </div>

        {/* Lunch Countdown */}
        <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <span className="text-2xl mr-2 flex-shrink-0">⏰</span>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
            {countdown}
          </div>
        </div>

      </div>
    </div>
  );
} 