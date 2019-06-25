import * as L from './lambda';
import * as d3 from 'd3';

let body = d3.select("body");

let div = body.append("div")
div.append("div")
    .style("font-size", "140px")
    .html("&lambda;")
div.style("text-align", "center")
    .style("position", "relative")
    .style("top", "40%")
    .style("transform", "translateY(40%)")
    .style("-webkit-transform", "translateY(40%)")
    .style("-ms-transform", "translateY(40%)")
    .append("input")
      .attr("type", "text")
      .attr("spellcheck", "false")
      .attr("id", "expression")
      .on("input", checkSyntax)

let expr = d3.select("#expression")
    .on("change", () => showEvaluated(expr.property("value"), "#result"))

div.append("div")
    .attr("id", "result")
    .style("width", "100%")
    .style("height", "500px")
    .style("overflow", "auto");

function showEvaluated(expr: string, element: string) {
    let output = d3.select(element).selectAll("div");
    let results = [];
    try {
        let gen = L.evaluateGen(L.parse(expr));
        for (let expr of gen) {
            results.push(L.print(expr));
        }
    } catch(error) {}
    output.data(results).join("div").text(d => d as string);
}

function checkSyntax() {
    let input = d3.select("#expression");
    try {
        L.parse(input.property("value"));
        input.style("color", "black")
    } catch(error) {
        input.style("color", "grey")
    }
}
