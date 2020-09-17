function parseChanges(ruleset) {
  const variables = resolveVariables(ruleset.variables);

  function resolveVariableList(list, flatVariables) {
    return list.reduce((acc, item) => {
      if (item.type == 'Literal') return [...acc, item.value];
      if (item.type == 'Variable') return [
        ...acc,
        ...flatVariables[item.name]
      ]
      return acc;
    }, []);
  }

  function resolveVariables(variables) {
    return Object.keys(variables)
      .reduce((acc, key) => {
        return ({
        ...acc,
        [key]: resolveVariableList(variables[key], acc)
      })}, {});
  }

  function buildSubjectRegex(subject) {
    if (subject.type == 'Literal') return `(?<subj>${subject.value})`;
    if (subject.type == 'Variable') return '(?<subj>' + variables[subject.name].join('|') + ')';
    if (subject.type == 'List_literal') return '(?<subj>' + subject.items.map(i => i.value).join('|') + ')';
  }

  function buildInfixRegex(env) {
    let prefix = '';
    let sufix = '';
    if (env.before.length > 0) {
      env.before.forEach(item => {
        if (item.type == 'Terminal') prefix += '(^|\s+)'
        if (item.type == 'Literal') prefix += `(?<=${item.value})`
        if (item.type == 'Variable') prefix += '(?<=' + variables[item.name].join('|') + ')'
      });
    }
    if (env.after.length > 0) {
      env.after.forEach(item => {
        if (item.type == 'Terminal') sufix += '($|\s+)'
        if (item.type == 'Literal') sufix += `(?=${item.value})`
        if (item.type == 'Variable') sufix += '(?=' + variables[item.name].join('|') + ')'
      });
    }
    return [prefix, sufix];
  }

  function buildRegex(change) {
    const subject = buildSubjectRegex(change.subject);
    const infixes = buildInfixRegex(change.env);
    return new RegExp(`${infixes[0]}${subject}${infixes[1]}`);
  }

  function buildReplacer(change) {
    const re = buildRegex(change);
    const target = change.target;
    const subject = change.subject;
    return value => value.replace(re, (...args) => {
      if (target.type == 'Zero') return '';
      if (target.type == 'Literal') return target.value;
      const groups = args[args.length - 1];
      const subj = groups.subj;
      const subjectPool = subject.type == 'Variable'
        ? variables[subject.name]
        : subject.type == 'List_literal'
          ? subject.items.map(i => i.value)
          : [];
      const targetPool = target.type == 'Variable'
        ? variables[target.name]
        : target.type == 'List_literal'
          ? target.items.map(i => i.value)
          : [];

      const idx = subjectPool.indexOf(subj);
      if (idx >= targetPool.length) {
        throw new Error('List mismatch when replacing ' + subj + ' from [' + subjectPool.join(',') + '] to [' + targetPool.join(',') + ']');
      }
      return targetPool[idx];
    })
  }

  const replacers = ruleset.changes.map(change => buildReplacer(change));
  return replacers;
}

module.exports = parseChanges;
