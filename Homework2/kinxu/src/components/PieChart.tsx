import React from "react";
import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { isEmpty } from "lodash";
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";

import { BookData, ComponentSize } from "../types";

export default function PieChart() {
    const [data, setData] = useState<BookData[]>();
    const pieRef = useRef<HTMLDivElement>(null);
    const margin = {top: 40, right: 80, bottom: 100, left: 20 };
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
        
    useResizeObserver({ ref: pieRef as React.RefObject<HTMLDivElement>, onResize });

    //Read Data
    useEffect(() => {
        const readData = async() => {
            const csvData = await d3.csv("./data/top_1000_most_swapped_books.csv")
            setData(csvData)
        }
        readData()
    }, []);

    // Generate Pie Chart
    useEffect(() => {
        if (isEmpty(data)) {return};
        if (size.width === 0 || size.height === 0) {return};
        d3.select("#pie-svg").selectAll("*").remove();
        generatePieChart()
    }, [data, size])

    function generatePieChart() {
        const pieChartContainer = d3.select("#pie-svg");

        let genreCounts = {};
        let subsetGenreCounts = {};
        let pieChartData = {};

        // Count frequency of each genre
        for (const book of data) {
            const genre = book.genre;
            // Get frequency of genre out of entire dataset
            if (genre in genreCounts) {
                genreCounts[genre] += 1;
            }
            else {
                genreCounts[genre] = 1;
            }

            // Get frequency of genre out of subset of books with an average rating >= 4.5
            if (book.rating_average >= 4.5) {
                if (genre in subsetGenreCounts) {
                    subsetGenreCounts[genre] += 1;
                }
                else {
                    subsetGenreCounts[genre] = 1;
                }
            }
        }


        // Get top 7 most frequent genres in the entire dataset
        const genreCountsArray = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]);
        const topGenres = genreCountsArray.slice(0, 7)
        .map((entry) => entry[0])
        .concat(["Other Genre"]);


        // Get distribution of genres for pie chart
        for (const genre of Object.keys(subsetGenreCounts)) {
            if (topGenres.includes(genre)) {
                pieChartData[genre] = subsetGenreCounts[genre];
            }
            else {
                if ("Other Genre" in pieChartData) {
                    pieChartData["Other Genre"] += subsetGenreCounts[genre];
                }
                else {
                    pieChartData["Other Genre"] = subsetGenreCounts[genre];
                }
            }
        }
        
        // Set color for each genre
        const colors = d3.scaleOrdinal()
        .domain(topGenres)
        .range(d3.schemeCategory10);

        // Radius of pie chart
        const radius = Math.min(size.width - margin.right - margin.left, size.height - margin.bottom - margin.top) / 2;
        const pieCenterX = margin.left + (size.width - margin.right - margin.left) /2;
        const pieCenterY = margin.top + 15 + (size.height - margin.bottom - margin.top) / 2;

        const pie = d3.pie().value((data) => data[1]);
        pieChartData = pie(Object.entries(pieChartData));

        var arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

        const pieChartGroup = pieChartContainer
        .append("g")
        .attr("transform", `translate(${pieCenterX}, ${pieCenterY})`);

        // Generate pie chart
        pieChartGroup
        .selectAll("path")
        .data(pieChartData)
        .enter()
        .append("path")
        .attr('d', arcGenerator)
        .attr('fill', (dataPoint) => colors(dataPoint.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 0.7);

        // Write number of books in each slice
        pieChartGroup.selectAll("text")
        .data(pieChartData)
        .enter()
        .append('text')
        .text(function(dataPoint){ return `${dataPoint.value}`})
        .attr("transform", (dataPoint) => `translate(${arcGenerator.centroid(dataPoint)})`)
        .style("text-anchor", "middle")
        .style("font-size", "0.8rem")
        .style("fill","black");


        const legend = pieChartContainer.append("g")
        .attr("id", "pie-chart-legend-container")
        .attr("transform", `translate(${size.width - margin.right}, ${margin.top + 20})`);

        // Generate legend title
        legend.append("g")
        .append("text")
        .attr("transform", `translate(0, 15)`)
        .style("text-anchor", "right")
        .style("font-weight", "bold")
        .style("font-size", "0.8rem")
        .text("Genre");

        // Generate legend
        const legendItem = legend.selectAll(".legend-item")
        .data(topGenres)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (dataPoint, i) => `translate(0, ${i * 35 + 20})`);

        legendItem.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", dataPoint => colors(dataPoint));

        legendItem.append("text")
        .attr("x", 26)
        .attr("y", 0)
        .style("font-size", "0.8rem")
        .each(function(dataPoint) {
            const words = dataPoint.split(" ");
            const lineHeight = 13;
            const textElement = d3.select(this);
            // If there are 2 words, place second word on next line
            for (let i = 0; i < words.length; i++) {
                let yPosition = 15;
                if (i != 0) {
                    yPosition += (i * lineHeight)
                }
                textElement.append("tspan")
                .text(words[i])
                .attr("x", 26)
                .attr("y", yPosition);
            }
        });


        // Generate title
        const title = pieChartContainer.append('g')
        .append('text')
        .attr('transform', `translate(${size.width / 2}, ${margin.top - 15})`)
        .attr('dy', '0.8rem')
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text('Number of Highly Rated (>= 4.5) Books by Genre');
    }

    return (
        <>
            <div ref = {pieRef} className = "chart-container">
                <svg id = "pie-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
          
}

  