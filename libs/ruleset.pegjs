{
  var stats = {
    variableNames: [],
    variables: {},
    changes: []
  };

  function handleVarSet(e) {
    if (stats.variableNames.indexOf(e.variable.name) > -1) {
      throw new Error('You can not redeclare ' + e.variable.name);
    }
    e.items
      .filter(function (item) {
        return item.type == 'Variable';
      })
      .forEach(function (item) {
        if (stats.variableNames.indexOf(item.name) == -1) {
          throw new Error('Variable "' + item.name + '" is not defined');
        }
      });
    stats.variableNames.push(e.variable.name);
    stats.variables[e.variable.name] = e.items;
  }

  function handleChanges(e) {
    var change = Object.assign({}, e);
    delete e.type;
    stats.changes.push(e);
  }

  function buildResponse() {
    return {
      variables: stats.variables,
      changes: stats.changes
    };
  }
}

EXPRESSION "expression"
  = _ exp:(
    COMMENT /
    CHANGE /
    VARIABLE_SET /
    EOL
  )* _
  {
    exp
      .filter(function (e) { return e !== undefined; })
      .forEach(function (e) {
        if (e.type == 'Variable_set') {
          handleVarSet(e);
        }
        if (e.type == 'Change') {
          handleChanges(e);
        }
        return e;
      });
    return buildResponse();
  }

COMMENT "comment"
  = COMM_ST (!EOL .)* {}

CHANGE "change"
  = LIST_CHANGE / LITERAL_CHANGE / VARIABLE_CHANGE

LITERAL_CHANGE
  = subj:(LITERAL+) _ TRANS _ targ:(ZERO/LITERAL+) _ ENV _ env:ENVIRONMENT _ label:LABEL? (_ COMMENT)?
  {
    var subject = subj.reduce(function(acc, s) {
      return Object.assign({}, acc, { value: acc.value += s.value });
    }, { type: 'Literal', value: '' });
    var target = Array.isArray(targ) ? targ.reduce(function(acc, s) {
      return Object.assign({}, acc, { value: acc.value += s.value });
    }, { type: 'Literal', value: '' }) : targ;
    return {
      type: 'Change',
      label: label,
      subject: subject,
      target: target,
      env: env
    };
  }

VARIABLE_CHANGE
  = subj:VARIABLE _ TRANS _ targ:(ZERO/LITERAL/VARIABLE/LIST_LITERAL) _ ENV _ env:ENVIRONMENT _ label:LABEL? (_ COMMENT)?
  {
    return {
      type: 'Change',
      label: label,
      subject: subj,
      target: targ,
      env: env
    };
  }

LIST_CHANGE
  = subj:LIST_LITERAL _ TRANS _ targ:(ZERO/LITERAL/VARIABLE/LIST_LITERAL) _ ENV _ env:ENVIRONMENT _ label:LABEL? (_ COMMENT)?
  {
    return {
      type: 'Change',
      label: label,
      subject: subj,
      target: targ,
      env: env
    };
  }

ENVIRONMENT "environment"
  = before:(LITERAL/VARIABLE/TERMINAL)* PLACEHOLDER after:(LITERAL/VARIABLE/TERMINAL)*
  {
    return {
      type: 'Env',
      before: before,
      after: after
    };
  }

VARIABLE_SET "variable set"
  = v:VARIABLE _ EQUALS _ LIST_ST _ items:(LIST) _ LIST_ED (_ COMMENT)?
  {
    return {
      type: 'Variable_set',
      variable: v,
      items: items
    };
  }

LIST "list"
  = head:(LIST_ITEM)
    body:(
      _ LIST_SP _ item:LIST_ITEM
      {
        return item;
      }
    )*
  {
    return [head].concat(body);
  }

LIST_LITERAL "list literal"
  = LIST_ST _ items:(LIST) _ LIST_ED
  {
    return {
      type: 'List_literal',
      items: items
    };
  }

LIST_ITEM "list item"
  = LITERAL/VARIABLE

LITERAL "literal"
  = v:[a-z]
  {
    return { type: 'Literal', value: v };
  }

VARIABLE "variable"
  = name:[A-Z][0-9]*
  {
    return {
      type: 'Variable',
      name: name
    };
  }

LIST_ST "list start"
  = "["
LIST_SP "list start"
  = ","
LIST_ED "list end"
  = "]"

EQUALS "equals"
  = "="

COMM_ST "comment start"
  = "//"

LABEL "label"
  = LABEL_ST label:(!LABEL_ED .)* LABEL_ED
  {
    return label.reduce(function (acc, l) {
      return acc.concat(l[1]);
    }, '');
  }

LABEL_ST "label start"
  = "<"
LABEL_ED "label end"
  = ">"

TERMINAL "terminal"
  = "#" { return { type: 'Terminal' }; }

PLACEHOLDER "subject placeholder"
  = "_"

ZERO "zero"
  = "ZERO" { return { type: 'Zero' }; }

ENV "set environment"
  = "/"

TRANS "set transformator"
  = ">"

_ "whitespace"
  = [ \t\n\r]*

EOL "end of line"
  = [\n\r]+ {}
