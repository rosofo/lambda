import * as L from './lambda';
import * as d3 from 'd3';

let body = d3.select("body");

let main = body.append("div")
main.append("div")
    .style("font-size", "140px")
    .html("&lambda;")
main.style("text-align", "center")
    .style("position", "relative")
    .style("top", "40%")
    .style("transform", "translateY(40%)")
    .style("-webkit-transform", "translateY(40%)")
    .style("-ms-transform", "translateY(40%)")
    .append("input")
      .style("width", "40%")
      .attr("type", "text")
      .attr("spellcheck", "false")
      .attr("id", "expression")
      .on("input", syntaxIndicate)

let expr = d3.select("#expression")
    .on("change", () => {
        resultGenerator = new ResultGenerator(expr.property("value"), "#result");
        resultGenerator.next(20);
    })


let result = main.append("div")
    .attr("id", "result")
    .style("width", "100%")
    .style("height", "400px")
    .style("overflow", "auto")
    .on("scroll", () => {
        if (result.property("scrollTop") % 400 > 100) resultGenerator.next(20);
    });

// help + examples

type example = {name: string, expr: string};

let examples = [
    {name: "Number one defined as successor applied to zero",
     expr: "(\\wyx.y(wyx))\\sz.z"},
    {name: "Add two and two",
     expr: "(\\ab.(a (\\wyx.y(wyx))) b) (\\sz.s(sz)) (\\sz.s(sz))"},
    {name: "Multiply three by four",
     expr: "(\\nmh.n(mh))(\\fx.f(f(fx)))(\\gy.g(g(g(gy))))"},
    {name: "Ω (Omega) - diverges!",
     expr: "(\\x.xx)(\\x.xx)"}
]

d3.select(".help").select("#examples")
    .selectAll("p")
    .data(examples)
    .join("p")
    .append("a")
      .text(d => (d as example).name)
      .on("click", d => setAndEvaluate((d as example).expr))

function setAndEvaluate(newExpr: string) {
    expr.property("value", newExpr);
    syntaxIndicate();
    resultGenerator = new ResultGenerator(newExpr, "#result")
    resultGenerator.next(20);
}

//end


class ResultGenerator {
    gen: IterableIterator<L.expression>;
    resultElement: any;
    results: string[];
    constructor(expr: string, element: string) {
        this.gen = L.evaluateGen(L.parse(expr));
        this.results = [];
        this.resultElement = d3.select(element).selectAll("div")
    }

    next(n: number = 1) {
        for (let i = 0; i < n; i++) {
            let next = this.gen.next();
            if (next.value) this.results.push(L.print(next.value));
        }

        this.resultElement
            .data(this.results)
            .join("div")
            .text((d: string, i: number) => `${i}: ${d as string}`);
    }
}

let resultGenerator: ResultGenerator;

function syntaxIndicate() {
    let input = d3.select("#expression");
    try {
        L.parse(input.property("value"));
        input.style("color", "black")
    } catch(error) {
        input.style("color", "grey")
    }
}
