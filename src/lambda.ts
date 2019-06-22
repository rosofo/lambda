import * as P from 'parsimmon';

export type lambda = {
    kind: "l",
    head: name,
    body: expression
};

export type name = string;

export type application = {
    kind: "ap",
    a: expression,
    b: expression
};

export type expression = lambda | name | application;

export function evaluate(expr: expression): expression {
}

function isNormal(expr: expression): boolean {
    if (isApplication(expr)) {
        if (isLambda(expr.a)) {
            return false;
        } else {
            return isNormal(expr.a) && isNormal(expr.b);
        }
    } else if (isLambda(expr)) {
        return isNormal(expr.body);
    } else {
        return true;
    }
}


function newLambda(head: name, body: expression): lambda {
    return {kind: 'l', head, body};
}

function newApplication(a: expression, b: expression): application {
    return {kind: 'ap', a, b};
}

function isApplication(expr: expression): expr is application {
    if (typeof expr == "string" || expr.kind == "l") {
        return false;
    } else {
        return true;
    }
}

function isLambda(expr: expression): expr is lambda {
    if (typeof expr == "string" || expr.kind == "ap") {
        return false;
    } else {
        return true;
    }
}

export function bind(lambda: lambda, expr: expression): expression {
    function replaceInExpression(current: expression): expression {
        if (typeof current == "string") {
            return current == lambda.head ? expr : current;
        } else if (isApplication(current)) {
            return newApplication(
                replaceInExpression(current.a),
                replaceInExpression(current.b)
            );
        } else {
            if (current.head == lambda.head) {
                return current;
            } else {
                return newLambda(
                    current.head,
                    replaceInExpression(current.body)
                );
            }
        }
    }

    return replaceInExpression(lambda.body);
}

// printing

export function print(expr: expression): string {
    if (typeof expr == "string") return expr;
    else if (isLambda(expr)) return `\\${expr.head}.${print(expr.body)}`;
    else {
        let a = print(expr.a), b = print(expr.b);
        if (typeof expr.a != "string") a = `(${a})`;
        if (typeof expr.b != "string") b = `(${b})`;
        return a + b;
    }
}

// parsing

export function parse(string: string): expression {
    return Lang.Term.tryParse(string);
}


const Lang = P.createLanguage<{
    Term: expression,
    Lambda: lambda,
    Application: expression,
    Name: name,
    Atom: expression
}>({
    Term: r => r.Application.or(r.Lambda),
    Lambda: r => {
        return P.seq(P.oneOf('\\'), r.Name.atLeast(1), P.oneOf('.'), r.Term)
            .map(result => {
                let names = result[1]
                return names.reduceRight((acc, name) => {
                    return {kind: 'l', head: name, body: acc};
                }, result[3]) as lambda;
            })
    },
    Application: r => {
        return r.Atom.atLeast(1)
            .map(atoms => {
                return atoms.reduce((acc, atom) => {
                    return {kind: 'ap', a: acc, b: atom};
                });
            })
    },
    Name: () => P.letter,
    Atom: r => P.alt(r.Term.wrap(P.string('('), P.string(')')), r.Name, r.Lambda)
});

// helpers

function last(array: any[]): any {
    return array[array.length - 1];
}
