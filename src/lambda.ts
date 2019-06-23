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
    let contexts: DepthFirst[] = []; // where we were when entering a scope
    let t = new DepthFirst(expr);
    let done = false;

    function enterScope(expr: lambda) {
        contexts.push(t);
        t = new DepthFirst(expr.body);
    }

    function exitScope() {
        let outer = contexts.pop();
        if (outer && isLambda(outer.current)) {
            outer.current.body = t.current;
            t = outer;
        }
    }

    while (!done) {
        if (isLambda(t.current)) {
            let sibling = t.rightSibling;
            if (sibling) {
                let result = bind(t.current, sibling);
                t.up();
                t.current = result;
            } else {
                enterScope(t.current);
            }
        } else {
            done = t.forward();
            if (done && contexts.length) {
                while (!t.stack.length && contexts.length) exitScope();
                if (!contexts.length) break;
                done = false;
            }
        }
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

    get rightSibling(): expression | undefined {
        let parent = last(this.stack);
        if (parent && parent.branchToNext == "left") {
            return parent.ap.b;
        }
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
                        return true;
                    }
                }
            } else {
                return true;
            }
        }

        return false;
    }
}

function newLambda(head: name, body: expression): lambda {
    return {kind: 'l', head, body};
}

function newApplication(a: expression, b: expression): application {
    return {kind: 'ap', a, b};
}

export function isApplication(expr: expression): expr is application {
    return !(typeof expr == "string" || expr.kind == "l");
}

export function isLambda(expr: expression): expr is lambda {
    return !(typeof expr == "string" || expr.kind == "ap");
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
    return Lang.Term.tryParse(string.replace(/\s/g, ''));
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
