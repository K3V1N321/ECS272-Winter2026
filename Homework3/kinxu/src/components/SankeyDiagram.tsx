import React from "react";
import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey"
import { isEmpty } from "lodash";
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";

import { BookData, ComponentSize } from "../types";

function handleMouseOver(event, dataPoint) {
    d3.select("#sankey-chart-tooltip")
    .html(`<strong>${dataPoint.value} Books</strong><br/>Genre: ${dataPoint.genre}<br/>${dataPoint.source.name} to ${dataPoint.target.name}`)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 10}px`)
    .style("opacity", 1);
}

function handleMouseMove(event) {
    d3.select("#sankey-chart-tooltip")
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 10}px`);
}

function handleMouseOut() {
    d3.select("#sankey-chart-tooltip")
    .style("opacity", 0);
}

function generateLegend(sankeyContainer, size, margin, topGenres, colors) {
    const legend = sankeyContainer.append("g")
    .attr("id", "sankey-diagram-legend-container")
    .attr("transform", `translate(${size.width - margin.right}, ${margin.top + 20})`)


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
}

function generateTitle(sankeyContainer, size, margin, selectedTimePeriod, minYear, maxYear) {
    let titleName = "";

    if (selectedTimePeriod == "Pre 1800s") {
        titleName = `Flow of ${selectedTimePeriod} Books' Characteristics To Movie Adaptation Status`
    }
    else {
        titleName = `Flow of ${minYear} - ${maxYear} Books' Characteristics To Movie Adaptation Status`
    }

    const title = sankeyContainer.append('g')
    .append("text")
    .attr("transform", `translate(${size.width / 2}, ${margin.top - 15})`)
    .attr("dy", '0.5rem')
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text(titleName);
}


function handleGenreFilter(links, selectedGenre) {
    // Decrease opacity of links not of selected genre
    links
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .style("opacity", (dataPoint) => {
        if (dataPoint.genre == selectedGenre) {
            return 1;
        }
        else {
            return 0.05;
        }
    })

    // Disable tooltip for links that aren't of selected genre
    links
    .on("mouseover", function (event, dataPoint) {
        if (dataPoint.genre == selectedGenre) {
            d3.select(this).style("cursor", "pointer");
            handleMouseOver(event, dataPoint);
        }
        else {
            d3.select(this).style("cursor", "default");
            return null;
        }
    })
    .on("mousemove", function (event, dataPoint) {
        if (dataPoint.genre == selectedGenre) {
            handleMouseMove(event);
        }
        else {
            return null;
        }
    })
    .on("mouseout", function (event, dataPoint) {
        if (dataPoint.genre == selectedGenre) {
            handleMouseOut();
        }
        else {
            return null;
        }
    })

    links.filter((dataPoint) => dataPoint.genre == selectedGenre)
    .sort((a, b) => b.value - a.value)
    .raise();
}

function resetDefaultView(links) {
    // Enable tooltip for all links
    links
    .on("mouseover", function (event, dataPoint) {
        d3.select(this).style("cursor", "pointer");
        handleMouseOver(event, dataPoint);
    })
    .on("mousemove", function (event, dataPoint) {
        handleMouseMove(event);
    })
    .on("mouseout", function (event, dataPoint) {
        handleMouseOut();
    })

    // Adjust opacity to highlight larger links
    links
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .style("opacity", 1)

    // Raise smaller links to foreground
    links.sort((a, b) => b.value - a.value)
    .raise();
}

export default function SankeyDiagram( {selectedTimePeriod, selectedGenre, selectedMinRating, selectedMaxRating} ) {
    const [data, setData] = useState<BookData[]>();
    const sankeyRef = useRef<HTMLDivElement>(null);
    const margin = {top: 40, right: 140, bottom: 100, left: 20 };
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [selectedFlow, setSelectedFlow] = useState(false);
        
    useResizeObserver({ ref: sankeyRef as React.RefObject<HTMLDivElement>, onResize });

    //Read Data
    useEffect(() => {
        const readData = async() => {
            const csvData = await d3.csv("./data/top_1000_most_swapped_books.csv")
            setData(csvData)
        }
        readData()
        d3.select("body")
        .append("div")
        .attr("id", "sankey-chart-tooltip")
        .attr("class", "chart-tooltip")
        .style("pointer-events", "none")
        .style("position", "absolute")
        .style("background", "rgb(255, 255, 255)")
        .style("color", "black")
        .style("padding", "5px 5px")
        .style("border-radius", "4px")
        .style("font-size", "0.8rem")
        .style("border", "1px solid black")
        .style("opacity", 0)
    }, []);

    // Generate sankey diagram
    useEffect(() => {
        if (isEmpty(data)) {return};
        if (size.width === 0 || size.height === 0) {return};
        
        setSelectedFlow(false)
        d3.select("#sankey-svg").selectAll("*").remove();
        generateSankeyDiagram()


    }, [data, size, selectedTimePeriod, selectedMinRating, selectedMaxRating])

    useEffect(() => {
        const links = d3.select("#sankey-svg")
        .select("#sankey-links-container")
        .selectAll("path");

        if (links.empty()) {
            return;
        }
    
        // If there's a genere selected
        if (selectedGenre != null) {
            setSelectedFlow(false);
            handleGenreFilter(links, selectedGenre);
        }
        else {
            setSelectedFlow(false);
            resetDefaultView(links)
        }
    }, [selectedGenre])

    useEffect(() => {
        const links = d3.select("#sankey-svg")
        .select("#sankey-links-container")
        .selectAll("path");

        if (links.empty()) {
            return;
        }

        if (selectedFlow == true) {
            return;
        }
        // If there's a genere selected
        if (selectedGenre != null) {
            handleGenreFilter(links, selectedGenre);
        }
        else {
            resetDefaultView(links)
        }
    }, [selectedFlow])

    function generateSankeyDiagram() {
        let minYear = 0;
        let maxYear = 0;

        if (selectedTimePeriod == "Pre 1800s") {
            maxYear = 1799;
        }
        else if (selectedTimePeriod != null) {
            minYear = Number(selectedTimePeriod.slice(0, selectedTimePeriod.length - 1));
            maxYear = minYear + 9;
            if (minYear == 2020) {
                maxYear = 2025;
            }
        }

        // const ratings = selectedRating.split("-").map((rating) => Number(rating.trim()))
        const sankeyContainer = d3.select("#sankey-svg");

        // Focus on books with an average rating >= 4.5
        let processedData = structuredClone(data);

        processedData = processedData.filter((dataPoint) => {
            const withinTimePeriod = dataPoint.publicationYear >= minYear && dataPoint.publicationYear <= maxYear;
            const withinRatingRange = dataPoint.rating_average >= selectedMinRating && dataPoint.rating_average <= selectedMaxRating;
            return withinTimePeriod && withinRatingRange;
        })

        // Nodes for column of whether or not the book was adapted to a movie
        const adaptedToMovie = ["TRUE", "FALSE"];
        // Nodes for age category column
        const ages = ["Children", "Young Adult", "Adult"];

        // Get top 7 most frequent genres in the entire dataset
        let genreCounts = {}
        for (const book of data) {
            const genre = book.genre;
            if (!(genre in genreCounts)) {
                genreCounts[genre] = 1;
            }
            else {
                genreCounts[genre] += 1;
            }
        }
        const genreCountsArray = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
        const topGenres = genreCountsArray.slice(0, 7).map((entry) => entry[0]).concat(["Other Genre"]);
        // Set color for each genre
        const colors = d3.scaleOrdinal()
        .domain(topGenres)
        .range(d3.schemeCategory10);

        // Get top 3 most frequent countries in the entire dataset
        let countryCounts = {}
        for (const book of data) {
            const country = book.most_popular_country;
            if (!(country in countryCounts)) {
                countryCounts[country] = 1;
            }
            else {
                countryCounts[country] += 1;
            }
        }
        const countryCountsArray = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
        const topCountries = countryCountsArray.slice(0, 3).map((entry) => entry[0]).concat(["Other Country"]);

        // Set infrequeny genres and countries as Other groups
        for (let i = 0; i < processedData.length; i++) {
            if (!(topCountries.includes(processedData[i].most_popular_country))) {
                processedData[i].most_popular_country = "Other Country";
            }
            if (!(topGenres.includes(processedData[i].genre))) {
                processedData[i].genre = "Other Genre";
            }
        }
        generateLegend(sankeyContainer, size, margin, topGenres, colors);
        generateTitle(sankeyContainer, size, margin, selectedTimePeriod, minYear, maxYear);
        if (processedData.length == 0) {
            return;
        }

        // Get links and nodes for sankey diagram
        let nodes = [];
        let nodeIndices = {};
        let links = [];

        for (const genre of topGenres) {
            for (const age of ages) {
                for (const country of topCountries) {
                    // Filter data by genre, age, and country
                    const filteredDataCountry = processedData.filter((dataPoint) => {
                        return dataPoint.genre == genre && dataPoint.age_category == age
                        && dataPoint.most_popular_country == country;
                    })
                    if (filteredDataCountry.length > 0) {
                        // Set node for age, if not yet set
                        if (!(age in nodeIndices)) {
                            nodeIndices[age] = Object.keys(nodes).length;
                            nodes.push({"name": age});
                        }
                        // Set node for country, if not yet set
                        if (!(country in nodeIndices)) {
                            nodeIndices[country] = Object.keys(nodes).length;
                            nodes.push({"name": country});
                        }
                        // Add link between age and country nodes
                        links.push({"source": nodeIndices[age],
                            "target": nodeIndices[country],
                            "value": filteredDataCountry.length,
                            "genre": genre,
                            "previous": "None"});
                    }
                    for (const answer of adaptedToMovie) {
                        // Further filter data by answer for if there is a movie adaptation
                        const filteredData = filteredDataCountry.filter((dataPoint) => {
                            return dataPoint.adapted_to_movie == answer;
                        })
                        // If there are books
                        if (filteredData.length > 0) {
                            // Set node for by answer for if there is a movie adaptation, if not yet set
                            if (!(answer in nodeIndices)) {
                                nodeIndices[answer] = Object.keys(nodes).length;
                                nodes.push({"name": answer});
                            }
                            const previous = `${age.replace(" ", "_")}-${country.replace(" ", "_")}`;
                            // Add link between nodes for country and answer for if there is a movie adaptation
                            links.push({"source": nodeIndices[country],
                                "target": nodeIndices[answer],
                                "value": filteredData.length,
                                "genre": genre,
                                "previous": previous});
                        } 
                    }
                }
            }
        }


        // Sankey diagram generate
        const sankeyGenerator = sankey()
        .nodeWidth(10)
        .nodePadding(30)
        .extent([
            [margin.left + 30, margin.top + 30],
            [size.width - margin.right - 30, size.height - margin.bottom]
        ])
        .nodeSort((a, b) => {
            // Sort nodes in order set by how they are in the arrays
            if (ages.includes(a.name) && ages.includes(b.name)) {
                return ages.indexOf(b.name) - ages.indexOf(a.name);
            } else if (topCountries.includes(a.name) && topCountries.includes(b.name)) {
                return topCountries.indexOf(a.name) - topCountries.indexOf(b.name);
            } else {
                return adaptedToMovie.indexOf(a.name) - adaptedToMovie.indexOf(b.name);
            }
        })
        .linkSort((a, b) => {
            // First, sort by genre alphabetically
            const genreComparison = d3.ascending(a.genre, b.genre);
            if (genreComparison !== 0) {
                return genreComparison;
            }
            // Sort by number of books, if same genre
            return b.value - a.value;
        });

        // Compute layout forsankey diagram
        const sankeyData = {"nodes": nodes, "links": links};
        sankeyGenerator(sankeyData);

        const nodeGroup = sankeyContainer.append("g")
        .attr("id", "sankey-nodes-container")
        .selectAll(".node")
        .data(sankeyData.nodes)
        .join("g")
        .attr("class", "node");

        // Generate nodes
        nodeGroup.append("rect")
        .attr("x", (dataPoint) => dataPoint.x0)
        .attr("y", (dataPoint) => dataPoint.y0)
        .attr("height", (dataPoint) => dataPoint.y1 - dataPoint.y0)
        .attr("width", (dataPoint) => dataPoint.x1 - dataPoint.x0)
        .attr("fill", "beige")
        .attr("stroke", "black");

        // Write nodes' name
        nodeGroup
        .append("text")
        .attr("x", (dataPoint) => (dataPoint.x1 + dataPoint.x0) / 2)
        .attr("y", (dataPoint) => dataPoint.y0 - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "0.8rem")
        .text((dataPoint) => dataPoint.name);

        // Generate links
        const sankeyLinksGroup = sankeyContainer.append("g")
        .attr("id", "sankey-links-container")
        .selectAll("path")
        .data(sankeyData.links)
        .enter()
        .append("path")
        .attr("class", (dataPoint) => {
            const genre = dataPoint.genre
            .replaceAll("'", "")
            .replaceAll(" ", "_")
            if (dataPoint.previous == "None") {
                const source = dataPoint.source.name.replace(" ", "_")
                const target = dataPoint.target.name.replace(" ", "_")
                return `${genre}-${source}-${target}`
            }
            else {
                return `${genre}-${dataPoint.previous} child`
            }

        })
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", (dataPoint) => colors(dataPoint.genre))
        .attr("stroke-width", (dataPoint) => dataPoint.width)
        .attr("fill", "none")
        .style("opacity", 1)
        .on("mouseover", function (event, dataPoint) {
            d3.select(this).style("cursor", "pointer");
            handleMouseOver(event, dataPoint);
        })
        .on("mousemove", function(event, dataPoint) {
            handleMouseMove(event);
        })
        .on("mouseout", function(event, dataPoint) {
            handleMouseOut();
        })
        .on("click", function(event, dataPoint) {
            if (d3.select(this).style("opacity") == "0.05") {
                return
            }
            setSelectedFlow((previous) => {
                const curLink = d3.select(this);
                if (previous == false) {
                    let linkClass = curLink.attr("class");
                    if (dataPoint.previous != "None") {
                        const genre = dataPoint.genre
                        .replaceAll("'", "")
                        .replaceAll(" ", "_")
                        linkClass = `${genre}-${curLink.data()[0].previous}`
                    }
                    d3.select("#sankey-links-container")
                    .selectAll("path")
                    .on("mouseover", function (event, dataPoint) {
                        if (d3.select(this).classed(linkClass)) {
                            d3.select(this).style("cursor", "pointer");
                            handleMouseOver(event, dataPoint);
                        }
                        else {
                            d3.select(this).style("cursor", "default");
                            return null;
                        }
                    })
                    .on("mousemove", function (event, dataPoint) {
                    if (d3.select(this).classed(linkClass)) {
                        handleMouseMove(event);
                    }
                    else {
                        return null;
                    }
                    })
                    .on("mouseout", function (event, dataPoint) {
                    if (d3.select(this).classed(linkClass)) {
                        handleMouseOut();
                    }
                    else {
                        return null;
                    }
                    })
                    .transition()
                    .duration(600)
                    .ease(d3.easeCircleInOut)
                    .style("opacity", function() {
                        if (d3.select(this).classed(linkClass)) {
                            return 1;
                        }
                        else {
                            return 0.05
                        }
                    });


                    d3.select("#sankey-links-container")
                    .selectAll("path")
                    .filter(function() {
                        return d3.select(this).classed(linkClass)
                    })
                    .sort((a, b) => b.value - a.value)
                    .raise();

                    return true
                }
                else {
                    return false;
                }
            })
        });
        d3.select("#sankey-svg")
        .select("#sankey-links-container")
        .selectAll("path")
        .sort((a, b) => b.value - a.value)
        .raise();


        const columns = [
            { name: "Age Category", xIndex: 0, categories: ages },
            { name: "Country Where Most Popular", xIndex: 1, categories: topCountries },
            { name: "Adapted To A Movie", xIndex: 2, categories: adaptedToMovie }
        ];

        // Add label for column
        for (const col of columns) {
            const nodesInColumn = sankeyData.nodes.filter((dataPoint) => col.categories.includes(dataPoint.name));
            const xCenter = d3.mean(nodesInColumn, (dataPoint) => (dataPoint.x0 + dataPoint.x1) / 2);
            const yBottom = d3.max(nodesInColumn, (dataPoint) => dataPoint.y1);
            sankeyContainer.append("text")
            .attr("x", xCenter)
            .attr("y", yBottom + 15)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("font-size", '0.8rem')
            .text(col.name)
            ;
        }

    }


    return (
        <>
            <div ref = {sankeyRef} className = "chart-container">
                <svg id = "sankey-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}