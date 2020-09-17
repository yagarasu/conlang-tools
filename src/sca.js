const fs = require('fs');
const minimist = require('minimist');
const rulesetParser = require('../libs/ruleset');
const rulesetChangeParser = require('../libs/rulesetChangeParser');
const styles = require('../libs/styles');

global.verbosity = 1;

const verbosityLabel = [
  'Quiet',
  'Normal',
  'Verbose'
];

function main () {
  const argv = minimist(process.argv.slice(2));
  setVerbosity(argv);

  log(styles.title('* Sound Change Applier *'));
  log(styles.dim('v1.0.0 by Alexys Hegmann "Yagarasu"\n'));
  log('Verbosity: %s', verbosityLabel[global.verbosity]);

  try {
    log(styles.dt('Lexicon: '), styles.dd(argv.i));
    log(styles.dt('Ruleset: '), styles.dd(argv.r));

    const rules = loadRuleset(argv.r);
    const lexicon = loadLexicon(argv.i);
    log('  > Changes to apply:', styles.number(rules.changes.length));
    log('  > Lexicon lines:', styles.number(lexicon.length));

    let newLexicon = '';
    if (argv.h) {
      newLexicon = applyRulesWithHistory(lexicon, rules);
    } else {
      newLexicon = applyRules(lexicon, rules);
    }
    if (argv.o) {
      saveNewLexicon(newLexicon, argv.o);
    } else {
      console.log(newLexicon);
    }
  } catch (e) {
    log(styles.error('There was an error!'));
    log(styles.error(e));
    log(e.stack);
  }
}
main();

function setVerbosity (args) {
  if (args.q) {
    global.verbosity = 0;
  } else if (args.v) {
    global.verbosity = 1;
  } else if (args.d) {
    global.verbosity = 2;
  }
}

function log(...msg) {
  if (global.verbosity == 0) return;
  console.log(...msg);
}

function verb(...msg) {
  if (global.verbosity < 1) return;
  console.log(...msg);
}

function loadRuleset(filename) {
  verb('Loading %s...', filename);
  var file = fs.readFileSync(filename, { encoding: 'utf8' });
  verb('Loaded. Parsing now...');
  const parsed = rulesetParser.parse(file);
  verb('Parsed', filename);
  return parsed;
}

function loadLexicon(filename) {
  verb('Loading %s...', filename);
  var file = fs.readFileSync(filename, { encoding: 'utf8' });
  verb('Loaded. Parsing now...');
  const lines = file.split(/[\n\r]+/).filter(v => v !== '');
  verb('Parsed', filename);
  return lines;
}

function saveNewLexicon(data, filename) {
  return fs.writeFileSync(filename, data.join('\n'), { encoding: 'utf8' });
}

function applyRules(lexicon, ruleset) {
  rules = rulesetChangeParser(ruleset);
  return lexicon.map((line, i) => {
    verb(styles.hilight(`Applying to #${i}: ${line}`))
    return rules.reduce((acc, rule, j) => {
      const newLine = rule(acc);
      if (newLine !== acc) {
        verb('  Change #%d: %s > %s', j, acc, newLine);
      }
      return newLine;
    }, line);
  });
}

function applyRulesWithHistory(lexicon, ruleset) {
  rules = rulesetChangeParser(ruleset);
  return lexicon.map((line, i) => {
    verb(styles.hilight(`Applying to #${i}: ${line}`))
    let currentLine = line;
    const history = rules.reduce((acc, rule, j) => {
      const newLine = rule(currentLine);
      if (newLine !== currentLine) {
        verb('  Change #%d: %s > %s', j, currentLine, newLine);
        currentLine = newLine;
        if (ruleset.changes[j].label) {
          return [...acc, `${newLine} [${ruleset.changes[j].label}]`];
        }
        return [...acc, newLine];
      }
      return acc;
    }, []);
    return [line, ...history].join(' > ');
  });
}
