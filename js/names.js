/* Traditions Matter — an invented language for names.
   The nation and its language are fictional. Words are built from a small
   made-up lexicon so every name carries an English meaning. */
(function () {
  'use strict';
  const TM = window.TM;

  const NOUNS = [
    ['seyo', 'River'], ['tahun', 'Elk'], ['kowi', 'Cedar'], ['peshu', 'Stone'], ['kiyan', 'Hawk'],
    ['nako', 'Bear'], ['wesa', 'Wind'], ['ilo', 'Star'], ['muka', 'Turtle'], ['teshi', 'Fire'],
    ['amo', 'Moon'], ['hesu', 'Sun'], ['pawi', 'Crane'], ['nuka', 'Otter'], ['yeta', 'Fox'],
    ['soke', 'Rain'], ['kenu', 'Oak'], ['tiwa', 'Sky'], ['mahe', 'Bison'], ['olu', 'Water'],
    ['sanu', 'Deer'], ['keya', 'Owl'], ['wisu', 'Snow'], ['hapo', 'Willow'], ['tuma', 'Thunder'],
    ['emi', 'Flower'], ['lasu', 'Cloud'], ['pena', 'Corn'], ['chali', 'Dawn'], ['nowe', 'Song'],
    ['siku', 'Wolf'], ['tena', 'Trail'], ['awo', 'Shell'], ['kesa', 'Leaf'], ['yuni', 'Berry'],
    ['moshi', 'Prairie'], ['hoka', 'Heron'], ['pita', 'Feather'], ['wema', 'Hill'], ['sowa', 'Spring'],
  ];
  const ADJ = [
    ['kise', 'Swift'], ['nashi', 'Quiet'], ['tavo', 'Tall'], ['meni', 'Bright'], ['oshu', 'Strong'],
    ['wani', 'Little'], ['hako', 'Red'], ['sewi', 'White'], ['kuna', 'Dark'], ['pemi', 'Far'],
    ['yasa', 'Gentle'], ['tolo', 'Old'], ['yehe', 'Laughing'], ['chiwa', 'Brave'], ['nami', 'Singing'],
    ['tesu', 'Standing'], ['huna', 'Running'], ['oko', 'Patient'], ['lise', 'Blue'], ['malu', 'Warm'],
    ['sapo', 'Clever'], ['ewa', 'Kind'], ['tiki', 'Small'], ['owa', 'Wise'], ['hoshe', 'Shining'],
    ['kawe', 'Wandering'], ['nesi', 'Still'], ['pahu', 'Golden'],
  ];

  const CLANS = [
    { id: 'elk', name: 'Elk', word: 'Tahun', color: '#b8743a' },
    { id: 'crane', name: 'Crane', word: 'Pawi', color: '#8fa3a8' },
    { id: 'turtle', name: 'Turtle', word: 'Muka', color: '#6f8a4a' },
    { id: 'bear', name: 'Bear', word: 'Nako', color: '#5a4030' },
    { id: 'hawk', name: 'Hawk', word: 'Kiyan', color: '#a8432a' },
    { id: 'otter', name: 'Otter', word: 'Nuka', color: '#4f6f78' },
  ];

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function join(a, b) {
    if (/[aeiou]$/.test(a) && /^[aeiou]/.test(b)) b = b.slice(1);
    return a + b;
  }

  TM.CLANS = CLANS;
  TM.Names = {
    person(rng, used) {
      for (let t = 0; t < 80; t++) {
        let w, m;
        if (rng.next() < 0.72) {
          const a = rng.pick(ADJ), n = rng.pick(NOUNS);
          w = join(a[0], n[0]);
          m = a[1] + ' ' + n[1];
        } else {
          const n1 = rng.pick(NOUNS), n2 = rng.pick(NOUNS);
          if (n1 === n2) continue;
          w = join(n1[0], n2[0]);
          m = n1[1] + ' ' + n2[1];
        }
        w = cap(w);
        if (w.length > 11) continue;
        if (!used || !used.has(w)) {
          if (used) used.add(w);
          return { name: w, meaning: m };
        }
      }
      const n = rng.pick(NOUNS);
      return { name: cap(n[0]) + rng.int(2, 9), meaning: n[1] };
    },
    nation(rng) {
      const n = rng.pick(NOUNS);
      return { name: cap(n[0] + 'wa'), meaning: 'People of the ' + n[1] };
    },
    village(rng) {
      const n = rng.pick(NOUNS);
      return { name: cap(n[0] + 'tan'), meaning: 'Place of the ' + n[1] };
    },
    camp(rng) {
      const n = rng.pick(NOUNS);
      return { name: cap(n[0] + 'pesa'), meaning: n[1] + ' Camp' };
    },
  };
})();
