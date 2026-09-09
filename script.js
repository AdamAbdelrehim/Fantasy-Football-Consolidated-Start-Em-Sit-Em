const recommendationValues = {
    "Start of the Week": 1.5,
    "(Start of the Week)": 1.5,

    "Must Start": 1,
    "(Must Start)": 1,
    "Start": 1,
    "(Start)": 1,

    "Sleeper": 0.5,
    "(Sleeper)": 0.5,
    "Stream": 0.5,
    "(Stream)": 0.5,

    "Bust Potential": -0.5,
    "(Bust Potential)": -0.5,
    "Bust Alert": -0.5,
    "(Bust Alert)": -0.5,
    "Sit": -1,
    "(Sit)": -1,

    "Sit of the Week": -1.5,
    "(Sit of the Week)": -1.5
};

let players = {};
let siteLinks = {};
let selectedPosition = "QB";
let scoreAscending = false;

const tableBody = document.getElementById("data-table");
const scoreHeader = document.querySelector("th[data-column='score']");
const playerSearch = document.getElementById("player-search");

const positionMenuButton = document.getElementById("position-menu-button");
const positionMenu = document.getElementById("position-menu");
const positionButtons = document.querySelectorAll(".position-button");

async function loadAllData() {
    try {
        const [nfl, si, cbs, sn, br] = await Promise.all([
            fetch("data/week-1/nfl-week-1.json")
                .then(response => response.json()),

            fetch("data/week-1/si-week-1.json")
                .then(response => response.json()),

            fetch("data/week-1/cbs-week-1.json")
                .then(response => response.json()),

            fetch("data/week-1/sn-week-1.json")
                .then(response => response.json()),

            fetch("data/week-1/br-week-1.json")
                .then(response => response.json())
        ]);

        const data = {
            nfl,
            si,
            cbs,
            sn,
            br
        };

        siteLinks = {};

        for (const site in data) {
            siteLinks[site] = {};

            for (const link of data[site].links || []) {
                siteLinks[site][link.position.toUpperCase()] = link.link;
            }
        }

        players = {};
        for (const site in data) {
            for (const position in data[site]) {

                if (position === "links") {
                    continue;
                }

                for (const player of data[site][position]) {
                    const name = player.name;

                    if (!players[name]) {
                        if (site === "sn" && player.recommendation === "(Must Start)") {
                            continue;
                        }
                        players[name] = {
                            name,
                            position,
                            nfl: null,
                            si: null,
                            cbs: null,
                            sn: null,
                            br: null,
                            totalScore: 0
                        };
                    }

                    players[name][site] = player.recommendation;
                    players[name].totalScore += recommendationValues[player.recommendation] || 0;
                }
            }
        }
        renderTable();
    } catch (error) {
        console.error("Error loading player data:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Unable to load player data.
                </td>
            </tr>
        `;
    }
}

function renderTable() {
    updateHeaderLinks();

    tableBody.innerHTML = "";

    const searchTerm = playerSearch.value
        .trim()
        .toLowerCase();

    const positionPlayers = Object.values(players)
        .filter(player =>
            player.position.toUpperCase() === selectedPosition
        )
        .filter(player =>
            player.name.toLowerCase().includes(searchTerm)
        )
        .sort((a, b) => b.totalScore - a.totalScore);

    for (const player of positionPlayers) {
        const consensus = calculateConsensus(player);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="player">
                ${player.name}
            </td>

            <td class="${getRecommendationClass(consensus)}">
                ${consensus}
            </td>

            <td class="score ${getScoreClass(player.totalScore)}">
                ${player.totalScore}
            </td>

            <td class="${getRecommendationClass(player.nfl)}">
                ${player.nfl ?? ""}
            </td>

            <td class="${getRecommendationClass(player.si)}">
                ${player.si ?? ""}
            </td>

            <td class="${getRecommendationClass(player.cbs)}">
                ${player.cbs ?? ""}
            </td>

            <td class="${getRecommendationClass(player.sn)}">
                ${player.sn ?? ""}
            </td>

            <td class="${getRecommendationClass(player.br)}">
                ${player.br ?? ""}
            </td>
        `;

        tableBody.appendChild(row);
    }
}

function sortByScore() {
    const rows = Array.from(tableBody.querySelectorAll("tr"));
    rows.sort((a, b) => {

        const aScore = parseFloat(
            a.querySelector(".score").textContent
        );

        const bScore = parseFloat(
            b.querySelector(".score").textContent
        );

        return scoreAscending
            ? aScore - bScore
            : bScore - aScore;
    });

    rows.forEach(row => tableBody.appendChild(row));
    scoreAscending = !scoreAscending;
}

function setupPositionMenu() {

    positionMenuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        positionMenu.classList.toggle("open");
    });

    positionButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedPosition = button.dataset.position;

            positionButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            positionMenuButton.textContent = `${selectedPosition} ▾`;
            positionMenu.classList.remove("open");

            renderTable();
        });

    });

    document.addEventListener("click", () => {
        positionMenu.classList.remove("open");
    });

    positionMenu.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

function setupScoreSorting() {
    if (!scoreHeader) {
        return;
    }
    scoreHeader.style.cursor = "pointer";
    scoreHeader.addEventListener("click", sortByScore);
}

function getRecommendationClass(recommendation) {
    if (!recommendation) {
        return "";
    }

    switch (recommendation) {
        case "Start":
        case "(Start)":
        case "Must Start":
        case "(Must Start)":
            return "start";

        case "Start of the Week":
        case "(Start of the Week)":
            return "start-of-week";

        case "Sit":
        case "(Sit)":
            return "sit";

        case "Sit of the Week":
        case "(Sit of the Week)":
            return "sit-of-week";

        case "Sleeper":
        case "(Sleeper)":
        case "Stream":
        case "(Stream)":
            return "sleeper";

        case "Bust Potential":
        case "(Bust Potential)":
        case "Bust Alert":
        case "(Bust Alert)":
            return "bust";

        case "Mixed":
        case "Mixed/Start":
        case "Mixed/Sit":
            return "mixed";

        default:
            return "";
    }
}

function calculateConsensus(player) {
    const recommendations = [
        player.nfl,
        player.si,
        player.cbs,
        player.sn,
        player.br
    ].filter(value => value !== null && value !== "");

    if (recommendations.length === 0) {
        return "";
    }

    const score = player.totalScore;
    const has = keyword =>
        recommendations.some(value =>
            value.replace(/[()]/g, "").includes(keyword)
        );

    const hasStart = has("Start") || has("Must Start");
    const hasSit = has("Sit") || has("Bust");
    const hasSleeper = has("Sleeper");
    const hasStream = has("Stream");

    if (score === 0) {
        return "Mixed";
    }

    if (score < 0) {
        if (hasStart || hasSleeper || hasStream) {
            return "Mixed/Sit";
        }

        return "Sit";
    }

    if (hasSit) {
        return "Mixed/Start";
    }

    if (recommendations.every(value => value === "Sleeper")) {
        return "Sleeper";
    }

    if (recommendations.every(value => value === "Stream")) {
        return "Stream";
    }

    return "Start";
}

function setupPlayerSearch() {
    playerSearch.addEventListener("input", () => {
        renderTable();
    });
}

function updateHeaderLinks() {
    const siteHeaders = document.querySelectorAll("th[data-site]");
    siteHeaders.forEach(header => {

        const site = header.dataset.site;
        const link = siteLinks[site]?.[selectedPosition] || "";

        header.onclick = null;
        header.classList.remove("clickable");

        if (link !== "") {
            header.onclick = () => {
                window.open(link, "_blank");
            };

            header.classList.add("clickable");
        }
    });
}

function getScoreClass(score) {
    const boundedScore = Math.max(-5, Math.min(5, score));

    if (boundedScore < 1 && boundedScore > -1) {
        return "score-0";
    }

    const level = Math.round(Math.abs(boundedScore) / 0.5);

    if (boundedScore > 0) {
        return `score-positive-${level}`;
    }

    return `score-negative-${level}`;
}

setupPositionMenu();
setupScoreSorting();
setupPlayerSearch();
loadAllData();