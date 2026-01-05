import { useCallback, useRef, useEffect, useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

// Game Host with game-aware commentary
interface GameState {
  timer: number;
  gameTimeRemaining: number;
  leader: string | null;
  participantCount: number;
  poolValue: number;
  sponsoredAmount: number;
  isSponsored: boolean;
  entryFee: number;
  isLive: boolean;
  commentCount: number;
  chatIntensity: 'low' | 'medium' | 'high';
}

// Host configurations
export interface HostConfig {
  id: string;
  name: string;
  voiceId: string;
  emoji: string;
  description: string;
}

export const AVAILABLE_HOSTS: HostConfig[] = [
  {
    id: 'crusader',
    name: 'Crusader',
    voiceId: 'I26ofw8CwlRZ6PZzoFaX',
    emoji: '🎙️',
    description: 'Bold African voice, high energy hype man',
  },
  {
    id: 'mark',
    name: 'Mark',
    voiceId: 'owJJWiaBmclx8j0HiPWm',
    emoji: '🎤',
    description: 'Smooth and confident host',
  },
  {
    id: 'adaobi',
    name: 'Adaobi',
    voiceId: 'V0PuVTP8lJVnkKNavZmc',
    emoji: '👸',
    description: 'Warm Igbo queen, encouraging and graceful energy',
  },
];

// Get host by ID
export const getHostById = (hostId: string): HostConfig => {
  return AVAILABLE_HOSTS.find(h => h.id === hostId) || AVAILABLE_HOSTS[0];
};

// Prize milestone thresholds for callouts
const PRIZE_MILESTONES = [5000, 10000, 20000, 50000, 100000, 250000, 500000];

// Format pool value for speech (e.g., 50000 -> "fifty thousand")
const formatPoolForSpeech = (amount: number): string => {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return millions === 1 ? 'one million' : `${millions} million`;
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    if (remainder === 0) {
      return `${thousands} thousand`;
    }
    return `${thousands} thousand ${remainder}`;
  }
  return amount.toString();
};

// Default prize callout phrases (used by Crusader and Mark)
const DEFAULT_PRIZE_CALLOUT_PHRASES = {
  value_highlight: (pool: number, isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    const sponsorNote = isSponsored ? ' And this one is sponsored!' : '';
    return [
      `Just a reminder... ${formattedPool} naira is on the line right now.${sponsorNote}`,
      `That's ${formattedPool} naira waiting for someone to claim it.`,
      `We're playing for ${formattedPool} naira here... that's real money!`,
      `Don't forget what's at stake... ${formattedPool} naira!`,
    ];
  },
  value_vague: () => [
    `That prize is serious... someone's about to get paid!`,
    `Real money sitting there... waiting for a name.`,
    `This could pay someone's bills... just saying!`,
    `Whoever wins this... is walking away happy!`,
    `That amount is life-changing for someone in here!`,
  ],
  milestone: (pool: number, _isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Woah! Prize pool just hit ${formattedPool} naira! This is getting BIG!`,
      `${formattedPool} naira now! The stakes keep rising!`,
      `We just crossed ${formattedPool} naira! The competition is heating up!`,
    ];
  },
  danger_mode: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Clock is running out... and ${formattedPool} naira is still unclaimed!`,
      `Time is ticking! That ${formattedPool} naira could be yours!`,
      `We're in danger mode now... ${formattedPool} naira waiting for a winner!`,
      `Last stretch! Someone is about to walk away with ${formattedPool} naira!`,
    ];
  },
  leader_prize: (name: string, pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `${name} is now holding onto ${formattedPool} naira! Can they keep it?`,
      `New leader! ${name} has their eyes on that ${formattedPool} naira!`,
      `${name} just took control of ${formattedPool} naira!`,
    ];
  },
  sponsored: (pool: number, sponsoredAmount: number) => {
    const formattedSponsored = formatPoolForSpeech(sponsoredAmount);
    return [
      `This one is sponsored! ${formattedSponsored} naira... FREE ENTRY, REAL MONEY!`,
      `Sponsored game alert! Someone is getting ${formattedSponsored} naira for FREE!`,
      `No entry fee on this one... but the prize is REAL! ${formattedSponsored} naira!`,
    ];
  },
  silence_breaker: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `It's quiet in here... but ${formattedPool} naira is still up for grabs!`,
      `Hello? Is anyone going to fight for this ${formattedPool} naira?`,
      `${formattedPool} naira just sitting there... who wants it?!`,
    ];
  },
  late_game: (pool: number, leader: string | null) => {
    const formattedPool = formatPoolForSpeech(pool);
    return leader ? [
      `${leader} is this close to ${formattedPool} naira... will someone stop them?`,
      `${formattedPool} naira is about to go to ${leader}!`,
      `Someone better act fast... ${leader} is running away with ${formattedPool} naira!`,
    ] : [
      `${formattedPool} naira is waiting for a name!`,
      `Someone is about to claim ${formattedPool} naira!`,
      `The prize is right there... ${formattedPool} naira for the taking!`,
    ];
  },
};

// Adaobi's warm Igbo-influenced prize callout phrases
const ADAOBI_PRIZE_CALLOUT_PHRASES = {
  value_highlight: (pool: number, isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    const sponsorNote = isSponsored ? ' And my dear, this one is sponsored!' : '';
    return [
      `Nwanne m, ${formattedPool} naira is waiting for you!${sponsorNote}`,
      `My people, ${formattedPool} naira is on the table. Who will claim it?`,
      `Chai! ${formattedPool} naira! This is your moment, nwanne!`,
      `Listen well, ${formattedPool} naira could change everything today!`,
    ];
  },
  value_vague: () => [
    `This prize is beautiful, my dear. Someone will smile today!`,
    `Real blessing is waiting for the right person!`,
    `Nwanne, this money can do wonderful things!`,
    `The winner today will celebrate with their family!`,
    `Blessings are upon whoever takes this prize home!`,
  ],
  milestone: (pool: number, _isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Chineke! The pool has reached ${formattedPool} naira! This is big!`,
      `${formattedPool} naira now! My heart is full watching this grow!`,
      `We have crossed ${formattedPool} naira! God is good!`,
    ];
  },
  danger_mode: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Time is going, nwanne! ${formattedPool} naira still waiting!`,
      `Hurry now! ${formattedPool} naira is almost claimed!`,
      `The clock is warning us... ${formattedPool} naira needs an owner!`,
      `Final moments! Who will take ${formattedPool} naira home to family?`,
    ];
  },
  leader_prize: (name: string, pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `${name} is holding ${formattedPool} naira with steady hands! Will they keep it?`,
      `Look at ${name}! They have their eyes on ${formattedPool} naira!`,
      `${name} has taken the blessing of ${formattedPool} naira!`,
    ];
  },
  sponsored: (pool: number, sponsoredAmount: number) => {
    const formattedSponsored = formatPoolForSpeech(sponsoredAmount);
    return [
      `This game is sponsored! ${formattedSponsored} naira, free for all! What a gift!`,
      `Nwanne, hear this! ${formattedSponsored} naira and no entry fee! God bless the sponsor!`,
      `Free entry, real money! ${formattedSponsored} naira waiting for you!`,
    ];
  },
  silence_breaker: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `My dear people, why so quiet? ${formattedPool} naira is still here!`,
      `Hello? ${formattedPool} naira is waiting patiently for someone!`,
      `${formattedPool} naira sitting there... who has the courage?`,
    ];
  },
  late_game: (pool: number, leader: string | null) => {
    const formattedPool = formatPoolForSpeech(pool);
    return leader ? [
      `${leader} is so close to ${formattedPool} naira... will anyone challenge?`,
      `${formattedPool} naira is almost in ${leader}'s hands!`,
      `Someone must act now! ${leader} is taking ${formattedPool} naira!`,
    ] : [
      `${formattedPool} naira is searching for its owner!`,
      `Someone will claim ${formattedPool} naira very soon!`,
      `The prize is ready... ${formattedPool} naira for the worthy one!`,
    ];
  },
};

// Get prize callout phrases based on host
const getPrizeCalloutPhrases = (hostId: string) => {
  if (hostId === 'adaobi') return ADAOBI_PRIZE_CALLOUT_PHRASES;
  return DEFAULT_PRIZE_CALLOUT_PHRASES;
};

// Default game-aware phrases (used by Crusader and Mark)
const DEFAULT_GAME_PHRASES = {
  welcome: (participants: number, pool: number) => [
    `Welcome to the arena! We've got ${participants} players fighting for ${formatPoolForSpeech(pool)} naira! Let's get it!`,
    `${participants} legends in the building! ${formatPoolForSpeech(pool)} naira on the line! This is gonna be EPIC!`,
    `${participants} players, ${formatPoolForSpeech(pool)} naira prize pool! Let the battle begin!`,
  ],
  
  game_start: (participants: number) => [
    `And we're LIVE! ${participants} players ready to rumble!`,
    `GO GO GO! ${participants} of you fighting for glory!`,
    `The game is ON! Show me what you got, all ${participants} of you!`,
  ],
  
  leader_change: (name: string, timer: number) => [
    `OH SNAP! ${name} just stole the crown with ${timer} seconds left!`,
    `${name} takes the lead! ${timer} seconds on the clock!`,
    `New leader alert! ${name} is on top! Only ${timer} seconds remain!`,
    `${name} said 'move over!' and took that top spot!`,
    `The crowd goes WILD! ${name} takes the throne!`,
  ],
  
  timer_60: (leader: string | null) => leader ? [
    `One minute left! ${leader} is leading but anything can happen!`,
    `60 seconds! ${leader} better watch their back!`,
  ] : [
    `One minute on the clock! Who's gonna step up?`,
    `60 seconds left! The tension is building!`,
  ],
  
  timer_30: (leader: string | null, comments: number) => [
    `30 seconds left! ${comments} comments so far! Things are getting SPICY!`,
    `Half a minute! ${leader ? `${leader} still on top!` : 'No clear leader!'} Who's gonna choke?`,
    `30 on the clock! The tension is REAL!`,
  ],
  
  timer_15: (leader: string | null) => [
    `15 SECONDS! My heart can't take this!${leader ? ` ${leader} is sweating!` : ''}`,
    `We're in the danger zone now! 15 seconds!`,
    `FIFTEEN! Someone DO something!`,
  ],
  
  timer_10: (leader: string | null) => [
    `TEN SECONDS! ${leader ? `${leader} is holding on!` : 'This is IT!'}`,
    `10! 9! This could be the end!`,
    `SINGLE DIGITS! Who wants it MORE?!`,
  ],
  
  timer_5: () => [
    `FIVE SECONDS! TYPE SOMETHING!`,
    `5! 4! 3! Oh this is tense!`,
    `FIVE! THE SUSPENSE IS KILLING ME!`,
  ],
  
  close_call: (name: string) => [
    `OH! ${name} with the CLUTCH save!`,
    `${name} just in time! That was SO close!`,
    `By the SKIN of their teeth! ${name} survives!`,
  ],
  
  game_over: (winner: string, prize: number) => [
    `GAME OVER! ${winner} takes home ${formatPoolForSpeech(prize)} naira! What a BATTLE!`,
    `AND THAT'S A WRAP! ${winner} is our champion with ${formatPoolForSpeech(prize)} naira!`,
    `The dust has settled! ${winner} claims victory and ${formatPoolForSpeech(prize)} naira!`,
  ],
  
  hype: (participants: number, comments: number) => [
    `${participants} players, ${comments} comments! This is CHAOS and I love it!`,
    `The energy in here is ELECTRIC! Keep those comments coming!`,
    `Shoutout to everyone competing! You're all legends!`,
    `The chat is FLYING! I can barely keep up!`,
  ],
  
  quiet_game: () => [
    `Come on people! Where's the energy? TYPE SOMETHING!`,
    `It's too quiet in here! Let's see some action!`,
    `Who wants to win? Show me that hunger!`,
  ],
};

// Adaobi's warm Igbo-influenced game phrases
const ADAOBI_GAME_PHRASES = {
  welcome: (participants: number, pool: number) => [
    `Welcome, my beautiful people! ${participants} players are here, fighting for ${formatPoolForSpeech(pool)} naira! Let us begin!`,
    `Nwanne m! ${participants} brave hearts in the arena! ${formatPoolForSpeech(pool)} naira prize! May the best person win!`,
    `${participants} players, ${formatPoolForSpeech(pool)} naira waiting! I am so excited to host you all!`,
  ],
  
  game_start: (participants: number) => [
    `We are LIVE! ${participants} players ready to shine!`,
    `The game begins now! All ${participants} of you, show your best!`,
    `Go now, my people! ${participants} players, make me proud!`,
  ],
  
  leader_change: (name: string, timer: number) => [
    `Wonderful! ${name} has taken the lead with ${timer} seconds remaining!`,
    `${name} moves to the top! ${timer} seconds on the clock!`,
    `New leader! ${name} is shining bright! Only ${timer} seconds left!`,
    `Look at ${name}! They have claimed the throne with grace!`,
    `The arena celebrates! ${name} takes the crown!`,
  ],
  
  timer_60: (leader: string | null) => leader ? [
    `One minute remains! ${leader} is leading but the game is not over!`,
    `60 seconds! ${leader}, stay focused my dear!`,
  ] : [
    `One minute left! Who will rise to the occasion?`,
    `60 seconds remaining! The moment is coming!`,
  ],
  
  timer_30: (leader: string | null, comments: number) => [
    `30 seconds left! ${comments} comments! The energy is beautiful!`,
    `Half a minute! ${leader ? `${leader} holds on!` : 'No clear leader yet!'} Who will emerge?`,
    `30 seconds! My heart is racing with you all!`,
  ],
  
  timer_15: (leader: string | null) => [
    `15 SECONDS! Chineke!${leader ? ` ${leader} is holding strong!` : ''}`,
    `We are in the final moments! 15 seconds!`,
    `FIFTEEN! Someone must make their move!`,
  ],
  
  timer_10: (leader: string | null) => [
    `TEN SECONDS! ${leader ? `${leader} is so close!` : 'This is the moment!'}`,
    `10! 9! The countdown begins!`,
    `Single digits! Who wants this blessing MORE?!`,
  ],
  
  timer_5: () => [
    `FIVE SECONDS! Type now, nwanne!`,
    `5! 4! 3! Oh my heart!`,
    `FIVE! The tension is too much!`,
  ],
  
  close_call: (name: string) => [
    `Chai! ${name} with the last-second save!`,
    `${name} just in time! That was so close, my dear!`,
    `By the grace of God! ${name} survives!`,
  ],
  
  game_over: (winner: string, prize: number) => [
    `GAME OVER! ${winner} takes home ${formatPoolForSpeech(prize)} naira! Congratulations, nwanne!`,
    `It is finished! ${winner} is our champion with ${formatPoolForSpeech(prize)} naira! God bless you!`,
    `The game has ended! ${winner} claims ${formatPoolForSpeech(prize)} naira! What a beautiful victory!`,
  ],
  
  hype: (participants: number, comments: number) => [
    `${participants} players, ${comments} comments! This is wonderful chaos!`,
    `The energy here is so beautiful! Keep the comments flowing!`,
    `I celebrate every one of you competing! You are all champions!`,
    `The chat is alive! I love this community!`,
  ],
  
  quiet_game: () => [
    `My dear people! Where is the energy? Show me something!`,
    `It is too quiet here! Let us see some action!`,
    `Who wants to win? Show me that fire in your heart!`,
  ],
};

// Get game phrases based on host
const getGamePhrases = (hostId: string) => {
  if (hostId === 'adaobi') return ADAOBI_GAME_PHRASES;
  return DEFAULT_GAME_PHRASES;
};

// ============= CO-HOST INTERACTIVE PHRASES =============
// These phrases show two hosts bantering and interacting like a real live show

const generateCoHostWelcome = (host1: HostConfig, host2: HostConfig, participants: number, pool: number) => {
  const formattedPool = formatPoolForSpeech(pool);
  return [
    `[${host1.name}] Welcome everyone to the arena! We have got ${participants} players today! [${host2.name}] That is right ${host1.name}! And they are fighting for ${formattedPool} naira!`,
    `[${host1.name}] ${formattedPool} naira on the line! [${host2.name}] This is going to be EPIC! ${participants} players ready to battle!`,
    `[${host2.name}] Look at this ${host1.name}! ${participants} brave souls! [${host1.name}] And ${formattedPool} naira waiting for a champion!`,
    `[${host1.name}] Good evening everyone! [${host2.name}] Welcome to the fastest finger arena! [${host1.name}] ${participants} players, ${formattedPool} naira! Let us GO!`,
    `[${host2.name}] ${host1.name}, can you feel that energy? [${host1.name}] Oh I feel it! ${participants} players ready to rumble for ${formattedPool} naira!`,
    `[${host1.name}] Another beautiful day in the arena! [${host2.name}] ${participants} competitors, ${formattedPool} naira prize! [${host1.name}] This is why we do this!`,
  ];
};

const generateCoHostGameStart = (host1: HostConfig, host2: HostConfig, participants: number) => [
  `[${host1.name}] We are LIVE! [${host2.name}] ${participants} players, let us GO!`,
  `[${host2.name}] The game has started! [${host1.name}] All ${participants} of you, show us what you have got!`,
  `[${host1.name}] Here we go! [${host2.name}] May the fastest finger win!`,
  `[${host2.name}] And we are off! [${host1.name}] ${participants} fingers ready! [${host2.name}] Let the battle begin!`,
  `[${host1.name}] Game time! [${host2.name}] I am so excited ${host1.name}! [${host1.name}] Me too! ${participants} players, FIGHT!`,
  `[${host2.name}] The countdown is over! [${host1.name}] Now the real fun begins! [${host2.name}] Show us those fast fingers!`,
];

const generateCoHostLeaderChange = (host1: HostConfig, host2: HostConfig, name: string, timer: number) => [
  `[${host1.name}] OH! ${name} takes the lead! [${host2.name}] With ${timer} seconds left! This is intense!`,
  `[${host2.name}] Did you see that ${host1.name}? ${name} just took over! [${host1.name}] ${timer} seconds on the clock!`,
  `[${host1.name}] New leader! ${name}! [${host2.name}] The crown has changed hands! ${timer} seconds remain!`,
  `[${host2.name}] ${name} said my turn! [${host1.name}] Love the energy! ${timer} seconds left!`,
  `[${host1.name}] Wait wait wait! [${host2.name}] What happened? [${host1.name}] ${name} just stole the throne! ${timer} seconds!`,
  `[${host2.name}] ${host1.name} look! [${host1.name}] I see it! ${name} is on top now! [${host2.name}] Only ${timer} seconds remaining!`,
  `[${host1.name}] The leaderboard just changed! [${host2.name}] ${name} with the takeover! [${host1.name}] ${timer} seconds to defend it!`,
  `[${host2.name}] Oh my! ${name} came out of nowhere! [${host1.name}] That is what I am talking about! ${timer} seconds left!`,
];

const generateCoHostTimer60 = (host1: HostConfig, host2: HostConfig, leader: string | null) => [
  `[${host1.name}] One minute left! [${host2.name}] ${leader ? `${leader} is leading but` : 'No clear leader and'} anything can happen!`,
  `[${host2.name}] 60 seconds ${host1.name}! [${host1.name}] The pressure is building! [${host2.name}] Who is going to crack?`,
  `[${host1.name}] We are in the final minute! [${host2.name}] This is where champions are made!`,
  `[${host2.name}] One minute on the clock! [${host1.name}] ${leader ? `${leader} better watch their back!` : 'Everyone is still in this!'}`,
];

const generateCoHostTimer30 = (host1: HostConfig, host2: HostConfig, leader: string | null, comments: number) => [
  `[${host1.name}] 30 seconds! [${host2.name}] ${comments} comments so far! ${leader ? `${leader} is leading!` : 'No clear leader!'}`,
  `[${host2.name}] Half a minute ${host1.name}! [${host1.name}] The tension is REAL! Who is going to choke?`,
  `[${host1.name}] 30 on the clock! [${host2.name}] I can barely watch! So exciting!`,
  `[${host2.name}] ${host1.name}, 30 seconds! [${host1.name}] I know! My hands are sweating! [${host2.name}] ${leader ? `${leader} is holding on!` : 'Anyone can win this!'}`,
  `[${host1.name}] Half a minute remains! [${host2.name}] The chat has ${comments} comments! [${host1.name}] Keep them coming!`,
];

const generateCoHostTimer15 = (host1: HostConfig, host2: HostConfig, leader: string | null) => [
  `[${host1.name}] 15 SECONDS! [${host2.name}] My heart is racing ${host1.name}!${leader ? ` ${leader} is sweating!` : ''}`,
  `[${host2.name}] Danger zone! [${host1.name}] 15 seconds! Someone DO something!`,
  `[${host1.name}] FIFTEEN! [${host2.name}] The suspense is killing me!`,
  `[${host2.name}] ${host1.name}! 15 seconds! [${host1.name}] I cannot breathe! [${host2.name}] Neither can the players!`,
  `[${host1.name}] We are in the red zone! [${host2.name}] 15 seconds! [${host1.name}] This is it people!`,
  `[${host2.name}] Final stretch! [${host1.name}] 15 seconds on the clock! [${host2.name}] ${leader ? `Can ${leader} hold on?` : 'Who wants it more?'}`,
];

const generateCoHostTimer10 = (host1: HostConfig, host2: HostConfig, leader: string | null) => [
  `[${host1.name}] TEN SECONDS! [${host2.name}] ${leader ? `${leader} is holding on!` : 'This is IT!'}`,
  `[${host2.name}] 10! 9! [${host1.name}] This could be the end!`,
  `[${host1.name}] Single digits! [${host2.name}] Who wants it MORE?!`,
  `[${host2.name}] TEN! [${host1.name}] NINE! [${host2.name}] EIGHT! [${host1.name}] Keep going!`,
  `[${host1.name}] 10 seconds ${host2.name}! [${host2.name}] I am on the edge of my seat! [${host1.name}] So am I!`,
  `[${host2.name}] Final countdown! [${host1.name}] 10 seconds! [${host2.name}] ${leader ? `${leader} is THIS close!` : 'No one is safe!'}`,
];

const generateCoHostTimer5 = (host1: HostConfig, host2: HostConfig) => [
  `[${host1.name}] FIVE! [${host2.name}] FOUR! [${host1.name}] THREE!`,
  `[${host2.name}] 5 SECONDS! [${host1.name}] TYPE SOMETHING NOW!`,
  `[${host1.name}] FIVE! [${host2.name}] THE TENSION IS UNBEARABLE!`,
  `[${host2.name}] FIVE! [${host1.name}] FOUR! [${host2.name}] THREE! [${host1.name}] TWO! [${host2.name}] ONE!`,
  `[${host1.name}] Last 5 seconds! [${host2.name}] My heart is going to explode! [${host1.name}] COME ON!`,
  `[${host2.name}] 5! 4! 3! [${host1.name}] Oh my goodness! [${host2.name}] 2! 1!`,
];

const generateCoHostGameOver = (host1: HostConfig, host2: HostConfig, winner: string, prize: number) => {
  const formattedPrize = formatPoolForSpeech(prize);
  return [
    `[${host1.name}] GAME OVER! [${host2.name}] ${winner} takes home ${formattedPrize} naira! What a battle!`,
    `[${host2.name}] We have a champion! [${host1.name}] Congratulations ${winner}! ${formattedPrize} naira is yours!`,
    `[${host1.name}] And that is a wrap! [${host2.name}] ${winner} with the victory! ${formattedPrize} naira! Amazing!`,
    `[${host2.name}] IT IS OVER! [${host1.name}] ${winner} did it! [${host2.name}] ${formattedPrize} naira richer! [${host1.name}] Incredible!`,
    `[${host1.name}] The dust has settled! [${host2.name}] And ${winner} stands victorious! [${host1.name}] ${formattedPrize} naira well earned!`,
    `[${host2.name}] What a game ${host1.name}! [${host1.name}] Unbelievable! ${winner} wins ${formattedPrize} naira! [${host2.name}] Champions are made here!`,
    `[${host1.name}] History is made! [${host2.name}] ${winner} claims the crown and ${formattedPrize} naira! [${host1.name}] See you next game everyone!`,
  ];
};

const generateCoHostHype = (host1: HostConfig, host2: HostConfig, participants: number, comments: number) => [
  `[${host1.name}] ${participants} players! [${host2.name}] ${comments} comments! [${host1.name}] This is CHAOS and I LOVE it!`,
  `[${host2.name}] The energy is ELECTRIC! [${host1.name}] I have never seen anything like this!`,
  `[${host1.name}] Shoutout to everyone competing! [${host2.name}] You are all legends!`,
  `[${host2.name}] Look at that chat flying ${host1.name}! [${host1.name}] ${comments} comments and counting! [${host2.name}] Beautiful!`,
  `[${host1.name}] The community is alive! [${host2.name}] This is what gaming is all about! [${host1.name}] Pure entertainment!`,
  `[${host2.name}] ${host1.name}, are you seeing this? [${host1.name}] ${participants} warriors battling it out! [${host2.name}] Magnificent!`,
  `[${host1.name}] I love this job! [${host2.name}] Me too ${host1.name}! [${host1.name}] ${participants} players giving us a show!`,
  `[${host2.name}] Keep those comments coming! [${host1.name}] ${comments} already! [${host2.name}] Let us break records today!`,
];

const generateCoHostQuiet = (host1: HostConfig, host2: HostConfig) => [
  `[${host1.name}] It is a bit quiet... [${host2.name}] Come on people! Show us something!`,
  `[${host2.name}] Hello? Anyone there? [${host1.name}] Let us see some action!`,
  `[${host1.name}] Who wants to win? [${host2.name}] Show us that hunger!`,
  `[${host2.name}] ${host1.name}, where did everyone go? [${host1.name}] I do not know! [${host2.name}] Wake up people!`,
  `[${host1.name}] The arena is too silent! [${host2.name}] We need some energy! [${host1.name}] TYPE SOMETHING!`,
  `[${host2.name}] Did everyone fall asleep? [${host1.name}] There is money on the line! [${host2.name}] Get those fingers moving!`,
  `[${host1.name}] Real money is waiting! [${host2.name}] And no one is fighting for it? [${host1.name}] Come on now!`,
];

const generateCoHostCloseCall = (host1: HostConfig, host2: HostConfig, name: string) => [
  `[${host1.name}] OH! [${host2.name}] ${name} with the CLUTCH save!`,
  `[${host2.name}] That was SO close! [${host1.name}] ${name} just in time!`,
  `[${host1.name}] By the skin of their teeth! [${host2.name}] ${name} survives!`,
  `[${host2.name}] DID YOU SEE THAT?! [${host1.name}] ${name} at the last second! [${host2.name}] My heart!`,
  `[${host1.name}] INCREDIBLE! [${host2.name}] ${name} nearly lost it! [${host1.name}] But they held on!`,
  `[${host2.name}] ${host1.name}! [${host1.name}] I SAW IT! ${name} with the save! [${host2.name}] Unbelievable reflexes!`,
  `[${host1.name}] That was too close for comfort! [${host2.name}] ${name} lives to fight another round!`,
];

const generateCoHostPrizeCallout = (host1: HostConfig, host2: HostConfig, pool: number, isSponsored: boolean) => {
  const formattedPool = formatPoolForSpeech(pool);
  const sponsorNote = isSponsored ? ' And it is sponsored!' : '';
  return [
    `[${host1.name}] ${formattedPool} naira on the line!${sponsorNote} [${host2.name}] That is serious money!`,
    `[${host2.name}] Do not forget the prize ${host1.name}! [${host1.name}] ${formattedPool} naira waiting for someone!`,
    `[${host1.name}] Real money right here! [${host2.name}] ${formattedPool} naira! Who will claim it?`,
    `[${host2.name}] ${host1.name}, remind them what they are playing for! [${host1.name}] ${formattedPool} naira! [${host2.name}] Life-changing money!`,
    `[${host1.name}] The prize pool is ${formattedPool} naira! [${host2.name}] Someone is going home happy today!`,
    `[${host2.name}] Look at that prize! [${host1.name}] ${formattedPool} naira! [${host2.name}] I wish I could play!`,
  ];
};

const generateCoHostMilestone = (host1: HostConfig, host2: HostConfig, pool: number) => {
  const formattedPool = formatPoolForSpeech(pool);
  return [
    `[${host1.name}] WAIT! [${host2.name}] What? [${host1.name}] The pool just hit ${formattedPool} naira! [${host2.name}] WOW!`,
    `[${host2.name}] ${host1.name}! The prize pool! [${host1.name}] I see it! ${formattedPool} naira! [${host2.name}] This is huge!`,
    `[${host1.name}] Milestone reached! [${host2.name}] ${formattedPool} naira! [${host1.name}] The stakes keep rising!`,
  ];
};

const generateCoHostDangerMode = (host1: HostConfig, host2: HostConfig, pool: number) => {
  const formattedPool = formatPoolForSpeech(pool);
  return [
    `[${host1.name}] We are in the danger zone! [${host2.name}] ${formattedPool} naira and time is running out!`,
    `[${host2.name}] ${host1.name}, the clock is ticking! [${host1.name}] And ${formattedPool} naira is still up for grabs!`,
    `[${host1.name}] Final stretch! [${host2.name}] Someone is about to win ${formattedPool} naira! [${host1.name}] Who will it be?`,
  ];
};

const generateCoHostSponsored = (host1: HostConfig, host2: HostConfig, sponsoredAmount: number) => {
  const formattedAmount = formatPoolForSpeech(sponsoredAmount);
  return [
    `[${host1.name}] This game is SPONSORED! [${host2.name}] ${formattedAmount} naira and FREE entry! [${host1.name}] Thank you sponsors!`,
    `[${host2.name}] Free game alert ${host1.name}! [${host1.name}] ${formattedAmount} naira prize! [${host2.name}] No entry fee! Amazing!`,
    `[${host1.name}] Shoutout to our sponsors! [${host2.name}] ${formattedAmount} naira up for grabs! [${host1.name}] And it is completely FREE!`,
  ];
};

export const useCrusaderHost = () => {
  const { settings } = useAudio();
  const { selectedHost, secondaryHost, isCoHostMode } = usePlatformSettings();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastPhrase, setLastPhrase] = useState('');
  
  // Get the current host configuration(s)
  const currentHost = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const minIntervalRef = useRef(3000); // Minimum 3 seconds between announcements
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);
  
  // Prize callout tracking refs
  const lastPrizeCalloutRef = useRef<number>(0);
  const prizeCalloutCountRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  const lastPrizeCalloutTypeRef = useRef<string>('');
  const dangerModeAnnouncedRef = useRef<boolean>(false);
  
  // Minimum interval between prize callouts (45 seconds)
  const PRIZE_CALLOUT_MIN_INTERVAL = 45000;
  // Maximum prize callouts per game
  const MAX_PRIZE_CALLOUTS_PER_GAME = 8;
  
  const gameStateRef = useRef<GameState>({
    timer: 60,
    gameTimeRemaining: 20 * 60,
    leader: null,
    participantCount: 0,
    poolValue: 0,
    sponsoredAmount: 0,
    isSponsored: false,
    entryFee: 0,
    isLive: false,
    commentCount: 0,
    chatIntensity: 'low',
  });

  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled && isEnabled;
  }, [settings.commentaryEnabled, isEnabled]);

  // Calculate chat intensity based on comment velocity
  const calculateChatIntensity = useCallback((commentCount: number): 'low' | 'medium' | 'high' => {
    // This is a simplified calculation - in reality you'd track velocity
    if (commentCount > 50) return 'high';
    if (commentCount > 20) return 'medium';
    return 'low';
  }, []);

  // Update game state
  const updateGameState = useCallback((state: Partial<GameState>) => {
    const newState = { ...gameStateRef.current, ...state };
    
    // Auto-calculate chat intensity
    if (state.commentCount !== undefined) {
      newState.chatIntensity = calculateChatIntensity(state.commentCount);
    }
    
    gameStateRef.current = newState;
  }, [calculateChatIntensity]);

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const audio = audioQueueRef.current.shift();
    
    if (audio) {
      audio.volume = settings.volume * 0.8;
      audio.onended = () => playNextInQueue();
      audio.onerror = () => {
        console.error('Audio playback error');
        playNextInQueue();
      };
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        playNextInQueue();
      });
    }
  }, [settings.volume]);

  // Queue audio for playback
  const queueAudio = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audioQueueRef.current.push(audio);
    
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  // Generate TTS using ElevenLabs with the selected host's voice
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current) return;
    
    const now = Date.now();
    if (now - lastAnnouncementRef.current < minIntervalRef.current) return;
    lastAnnouncementRef.current = now;

    setLastPhrase(text);
    console.log(`[${currentHost.name}]:`, text);

    try {
      const { data, error } = await supabase.functions.invoke('crusader-tts', {
        body: { text, voiceId: currentHost.voiceId },
      });

      if (error) {
        console.error('TTS error:', error);
        fallbackSpeak(text);
        return;
      }

      if (data?.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        queueAudio(audioUrl);
      }
    } catch (err) {
      console.error('TTS request failed:', err);
      fallbackSpeak(text);
    }
  }, [queueAudio, currentHost]);

  // Fallback to Web Speech API
  const fallbackSpeak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.85;
      utterance.volume = settings.volume * 0.7;
      
      const voices = synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    }
  }, [settings.volume]);

  // Get random phrase from array
  const getRandomPhrase = (phrases: string[]): string => {
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // Check if prize callout is allowed (anti-spam)
  const canCalloutPrize = useCallback((type: string): boolean => {
    const now = Date.now();
    const state = gameStateRef.current;
    
    // Check max callouts
    if (prizeCalloutCountRef.current >= MAX_PRIZE_CALLOUTS_PER_GAME) {
      return false;
    }
    
    // Check interval (except for milestones which are event-driven)
    if (type !== 'milestone' && now - lastPrizeCalloutRef.current < PRIZE_CALLOUT_MIN_INTERVAL) {
      return false;
    }
    
    // Don't callout if chat is very intense (let the action speak)
    if (state.chatIntensity === 'high' && type !== 'milestone' && type !== 'danger_mode') {
      return false;
    }
    
    // Avoid repeating the same type consecutively
    if (type === lastPrizeCalloutTypeRef.current && type !== 'danger_mode') {
      return false;
    }
    
    return true;
  }, []);

  // Record a prize callout
  const recordPrizeCallout = useCallback((type: string) => {
    lastPrizeCalloutRef.current = Date.now();
    prizeCalloutCountRef.current += 1;
    lastPrizeCalloutTypeRef.current = type;
  }, []);

  // Strategic prize callout function
  const calloutPrize = useCallback((
    reason: 'milestone' | 'danger_mode' | 'leader_change' | 'silence_breaker' | 'reminder' | 'sponsored' | 'late_game'
  ) => {
    if (!canCalloutPrize(reason)) return;
    
    const state = gameStateRef.current;
    const { poolValue, isSponsored, sponsoredAmount, leader, participantCount, entryFee } = state;
    
    // Get host-specific phrases
    const PRIZE_PHRASES = getPrizeCalloutPhrases(currentHost.id);
    
    // Adapt intensity based on game size
    const isSmallGame = participantCount < 10;
    
    let phrases: string[] = [];
    
    switch (reason) {
      case 'milestone':
        phrases = PRIZE_PHRASES.milestone(poolValue, isSponsored);
        break;
        
      case 'danger_mode':
        phrases = PRIZE_PHRASES.danger_mode(poolValue);
        break;
        
      case 'leader_change':
        if (leader) {
          phrases = PRIZE_PHRASES.leader_prize(leader, poolValue);
        }
        break;
        
      case 'silence_breaker':
        phrases = PRIZE_PHRASES.silence_breaker(poolValue);
        break;
        
      case 'sponsored':
        if (isSponsored) {
          phrases = PRIZE_PHRASES.sponsored(poolValue, sponsoredAmount || poolValue);
        }
        break;
        
      case 'late_game':
        phrases = PRIZE_PHRASES.late_game(poolValue, leader);
        break;
        
      case 'reminder':
      default:
        // Alternate between specific and vague mentions for variety
        if (Math.random() > 0.4) {
          phrases = PRIZE_PHRASES.value_highlight(poolValue, isSponsored);
        } else {
          phrases = PRIZE_PHRASES.value_vague();
        }
        break;
    }
    
    // For small games, tone down the hype
    if (isSmallGame && reason !== 'milestone') {
      // Use vague phrases more often for small games
      if (Math.random() > 0.3) {
        phrases = PRIZE_PHRASES.value_vague();
      }
    }
    
    if (phrases.length > 0) {
      speak(getRandomPhrase(phrases));
      recordPrizeCallout(reason);
    }
  }, [canCalloutPrize, recordPrizeCallout, speak, currentHost.id]);

  // Check for prize milestones
  const checkPrizeMilestone = useCallback((newPoolValue: number) => {
    const crossedMilestone = PRIZE_MILESTONES.find(
      milestone => newPoolValue >= milestone && lastMilestoneRef.current < milestone
    );
    
    if (crossedMilestone) {
      lastMilestoneRef.current = crossedMilestone;
      calloutPrize('milestone');
    }
  }, [calloutPrize]);

  // Check for danger mode entry (last 5 minutes)
  const checkDangerMode = useCallback((gameTimeRemaining: number) => {
    const isDangerMode = gameTimeRemaining <= 5 * 60 && gameTimeRemaining > 0;
    
    if (isDangerMode && !dangerModeAnnouncedRef.current) {
      dangerModeAnnouncedRef.current = true;
      // Slight delay to avoid overlap with other announcements
      setTimeout(() => calloutPrize('danger_mode'), 2000);
    }
  }, [calloutPrize]);

  // Game-aware announcements with co-host support
  const welcomeToArena = useCallback(() => {
    const { participantCount, poolValue } = gameStateRef.current;
    
    if (isCoHostMode && coHost) {
      const phrases = generateCoHostWelcome(currentHost, coHost, participantCount, poolValue);
      speak(getRandomPhrase(phrases));
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      const phrases = PHRASES.welcome(participantCount, poolValue);
      speak(getRandomPhrase(phrases));
    }
  }, [speak, currentHost, coHost, isCoHostMode]);

  const announceGameStart = useCallback(() => {
    const { participantCount, isSponsored } = gameStateRef.current;
    
    if (isCoHostMode && coHost) {
      const phrases = generateCoHostGameStart(currentHost, coHost, participantCount);
      speak(getRandomPhrase(phrases));
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      const phrases = PHRASES.game_start(participantCount);
      speak(getRandomPhrase(phrases));
    }
    
    // Reset prize callout tracking for new game
    prizeCalloutCountRef.current = 0;
    lastPrizeCalloutRef.current = 0;
    lastMilestoneRef.current = 0;
    dangerModeAnnouncedRef.current = false;
    
    // If sponsored, announce it shortly after start
    if (isSponsored) {
      setTimeout(() => calloutPrize('sponsored'), 5000);
    }
  }, [speak, calloutPrize, currentHost, coHost, isCoHostMode]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    const { timer, poolValue, participantCount } = gameStateRef.current;
    
    if (isCoHostMode && coHost) {
      const phrases = generateCoHostLeaderChange(currentHost, coHost, leaderName, timer);
      speak(getRandomPhrase(phrases));
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      const phrases = PHRASES.leader_change(leaderName, timer);
      speak(getRandomPhrase(phrases));
    }
    
    // Occasionally add prize context to leader changes (20% chance for large pools)
    const isLargePool = poolValue >= 20000;
    const isLateGame = timer <= 30;
    
    if (isLargePool && isLateGame && Math.random() < 0.3 && participantCount >= 10) {
      setTimeout(() => calloutPrize('leader_change'), 3000);
    }
  }, [speak, calloutPrize, currentHost, coHost, isCoHostMode]);

  const announceTimerLow = useCallback((seconds: number) => {
    const { leader, commentCount, gameTimeRemaining } = gameStateRef.current;
    
    // Check danger mode when timer warnings happen
    checkDangerMode(gameTimeRemaining);
    
    let phrases: string[] = [];
    
    if (isCoHostMode && coHost) {
      if (seconds === 30) {
        phrases = generateCoHostTimer30(currentHost, coHost, leader, commentCount);
      } else if (seconds === 15) {
        phrases = generateCoHostTimer15(currentHost, coHost, leader);
      } else if (seconds === 10) {
        phrases = generateCoHostTimer10(currentHost, coHost, leader);
        if (Math.random() < 0.4) {
          setTimeout(() => calloutPrize('late_game'), 2000);
        }
      } else if (seconds === 5) {
        phrases = generateCoHostTimer5(currentHost, coHost);
      }
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      if (seconds === 60) {
        phrases = PHRASES.timer_60(leader);
      } else if (seconds === 30) {
        phrases = PHRASES.timer_30(leader, commentCount);
      } else if (seconds === 15) {
        phrases = PHRASES.timer_15(leader);
      } else if (seconds === 10) {
        phrases = PHRASES.timer_10(leader);
        if (Math.random() < 0.4) {
          setTimeout(() => calloutPrize('late_game'), 2000);
        }
      } else if (seconds === 5) {
        phrases = PHRASES.timer_5();
      }
    }
    
    if (phrases.length > 0) {
      speak(getRandomPhrase(phrases));
    }
  }, [speak, checkDangerMode, calloutPrize, currentHost, coHost, isCoHostMode]);

  const announceCloseCall = useCallback((playerName?: string) => {
    const { leader } = gameStateRef.current;
    const name = playerName || leader || 'Someone';
    
    if (isCoHostMode && coHost) {
      const phrases = generateCoHostCloseCall(currentHost, coHost, name);
      speak(getRandomPhrase(phrases));
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      const phrases = PHRASES.close_call(name);
      speak(getRandomPhrase(phrases));
    }
  }, [speak, currentHost, coHost, isCoHostMode]);

  const announceGameOver = useCallback((winnerName?: string, prize?: number) => {
    const { leader, poolValue } = gameStateRef.current;
    const winner = winnerName || leader || 'The champion';
    const prizeAmount = prize || Math.floor(poolValue * 0.5);
    
    if (isCoHostMode && coHost) {
      const phrases = generateCoHostGameOver(currentHost, coHost, winner, prizeAmount);
      speak(getRandomPhrase(phrases));
    } else {
      const PHRASES = getGamePhrases(currentHost.id);
      const phrases = PHRASES.game_over(winner, prizeAmount);
      speak(getRandomPhrase(phrases));
    }
  }, [speak, currentHost, coHost, isCoHostMode]);

  const randomHype = useCallback(() => {
    const { participantCount, commentCount, chatIntensity, poolValue } = gameStateRef.current;
    
    // If game is quiet
    if (commentCount < 5 && gameStateRef.current.isLive) {
      if (Math.random() < 0.3 && poolValue > 0) {
        calloutPrize('silence_breaker');
      } else {
        if (isCoHostMode && coHost) {
          const phrases = generateCoHostQuiet(currentHost, coHost);
          speak(getRandomPhrase(phrases));
        } else {
          const PHRASES = getGamePhrases(currentHost.id);
          const phrases = PHRASES.quiet_game();
          speak(getRandomPhrase(phrases));
        }
      }
    } else {
      // Regular hype
      if (chatIntensity !== 'high' && Math.random() < 0.15 && poolValue >= 10000) {
        calloutPrize('reminder');
      } else {
        if (isCoHostMode && coHost) {
          const phrases = generateCoHostHype(currentHost, coHost, participantCount, commentCount);
          speak(getRandomPhrase(phrases));
        } else {
          const PHRASES = getGamePhrases(currentHost.id);
          const phrases = PHRASES.hype(participantCount, commentCount);
          speak(getRandomPhrase(phrases));
        }
      }
    }
  }, [speak, calloutPrize, currentHost, coHost, isCoHostMode]);

  const announceWinners = useCallback((winners: Array<{ name: string; position: number; prize: number }>) => {
    if (winners.length === 0) return;
    
    // Announce in sequence with delays
    winners.forEach((winner, index) => {
      setTimeout(() => {
        const positionText = winner.position === 1 ? 'first place' : 
                            winner.position === 2 ? 'second place' : 'third place';
        speak(`${positionText} goes to ${winner.name} with ${formatPoolForSpeech(winner.prize)} naira!`);
      }, index * 3000);
    });
  }, [speak]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    enabledRef.current = enabled;
  }, []);

  // Stop all audio
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioQueueRef.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isEnabled,
    lastPhrase,
    currentHost,
    coHost,
    isCoHostMode,
    setEnabled,
    updateGameState,
    welcomeToArena,
    announceGameStart,
    announceLeaderChange,
    announceTimerLow,
    announceCloseCall,
    announceGameOver,
    announceWinners,
    randomHype,
    calloutPrize,
    checkPrizeMilestone,
    checkDangerMode,
    speak,
    stopSpeaking,
  };
};
