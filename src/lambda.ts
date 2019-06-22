import * as P from 'parsimmon';

export const identity = "(\\x.x)"
export const succ = "(\\wyx.y(wyx))";
export const zero = "(\\sz.z)";
export const add = (a: string, b: string) => a + "(\\mnfx.mf(nfx))" + b;

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

export const interpret = (s: string) => print(evaluate(parse(s)));

export function evaluate(expr: expression): expression {
    let t = new DepthFirst(expr);
    let notDone = true;

    while (notDone) {
        if (isApplication(t.current)) {
            if (isLambda(t.current.a)) {
                t.current = bind(t.current.a, t.current.b);
                if (isLambda(t.current)) {
                    if (last(t.stack)) {
                        t.up();
                        continue;
                    } else {
                        t.current = evaluate(t.current);
                    }
                } else {
                    continue;
                }
            } else if (isLambda(t.current.b)) t.current = evaluate(t.current);
        } else if (isLambda(t.current)) {
            t.current.body = evaluate(t.current.body);
        }
        notDone = t.forward();
    }

    return t.current;
}


// traversal

type node = {ap: application, branchToNext: "left" | "right"};

export class Traverser {
    current: expression;
    stack: node[];

    constructor(expr: expression) {
        this.current = expr;
        this.stack = [];
    }

    left() {
        if (isApplication(this.current)) {
            this.stack.push({ap: this.current, branchToNext: "left"});
            this.current = this.current.a;
            return true;
        }
        else return false;
    }

    right() {
        if (isApplication(this.current)) {
            this.stack.push({ap: this.current, branchToNext: "right"});
            this.current = this.current.b;
            return true;
        } else return false;
    }

    up() {
        let above = this.stack.pop();
        if (above) {
            if (above.branchToNext == "left") {
                above.ap.a = this.current;
            } else {
                above.ap.b = this.current;
            }
            this.current = above.ap;
            return true;
        } else return false;
    }
}

export class DepthFirst extends Traverser {
    forward() {
        if (isApplication(this.current)) this.left();
        else {
            let above = last(this.stack);
            if (above) {
                if (above.branchToNext == "left") {
                    this.up();
                    this.right();
                } else {
                    while (above && above.branchToNext == "right") {
                        this.up();
                        above = last(this.stack);
                    }
                    if (above) {
                        this.up();
                        this.right();
                    } else {
                        return false;
                    }
                }
            } else {
                return false;
            }
        }

        return true;
    }
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

export function isApplication(expr: expression): expr is application {
    if (typeof expr == "string" || expr.kind == "l") {
        return false;
    } else {
        return true;
    }
}

export function isLambda(expr: expression): expr is lambda {
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
