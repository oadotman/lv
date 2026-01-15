const fs = require('fs');
const path = require('path');

// Map of incorrect to correct values
const replacements = {
  '"Dry Van"': '"dry_van"',
  '"Reefer"': '"reefer"',
  '"Flatbed"': '"flatbed"',
  '"Step Deck"': '"step_deck"',
  '"RGN"': '"rgn"',
  '"Power Only"': '"power_only"',
  '"Box Truck"': '"box_truck"',
  '"Hotshot"': '"hotshot"',
  '"Tanker"': '"tanker"',
  '"Curtain Side"': '"curtain_side"',
  '"Auto Carrier"': '"auto_carrier"',
  '"Conestoga"': '"conestoga"',
  '"Double Drop"': '"double_drop"'
};

// Files to fix
const files = [
  'components/extraction/ExtractionReview.tsx',
  'app/(dashboard)/carriers/page.tsx',
  'app/(dashboard)/loads/[id]/page.tsx',
  'lib/openai-freight.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    for (const [incorrect, correct] of Object.entries(replacements)) {
      if (content.includes(incorrect)) {
        content = content.replace(new RegExp(incorrect, 'g'), correct);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed equipment types in ${file}`);
    }
  }
});

console.log('Equipment type fixes complete');