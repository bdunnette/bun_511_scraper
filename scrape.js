import { createObjectCsvWriter } from 'csv-writer';

async function fetchCameras() {
    const url = "https://511mn.org/api/graphql";
    
    const query = `
    query ($input: ListArgs!) {
      listCameraViewsQuery(input: $input) {
        cameraViews {
          title
          uri
          url
          sources {
            type
            src
          }
          parentCollection {
            title
            location {
              routeDesignator
            }
          }
        }
        totalRecords
      }
    }
    `;

    const variables = {
        input: {
            west: -180,
            south: -85,
            east: 180,
            north: 85,
            sortDirection: "DESC",
            sortType: "ROADWAY",
            freeSearchTerm: "",
            classificationsOrSlugs: [],
            recordLimit: 2000,
            recordOffset: 0
        }
    };

    const payload = {
        query,
        variables
    };

    console.log("Fetching camera data from 511mn.org...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const cameraViews = data.data?.listCameraViewsQuery?.cameraViews || [];
        const totalRecords = data.data?.listCameraViewsQuery?.totalRecords || 0;

        console.log(`Successfully retrieved ${cameraViews.length} / ${totalRecords} cameras.`);
        return cameraViews;
    } catch (e) {
        console.error(`Failed to fetch data: ${e}`);
        return [];
    }
}

async function saveToCsv(cameras, filename = "mn_cameras.csv") {
    if (!cameras || cameras.length === 0) {
        console.warn("No camera data to save.");
        return;
    }

    const csvWriter = createObjectCsvWriter({
        path: filename,
        header: [
            { id: 'title', title: 'Title' },
            { id: 'uri', title: 'URI' },
            { id: 'webUrl', title: 'Web URL' },
            { id: 'streamUrl', title: 'Stream URL' },
            { id: 'roadway', title: 'Roadway' },
            { id: 'route', title: 'Route' }
        ]
    });

    const records = cameras.map(cam => {
        const sources = cam.sources || [];
        const streamUrl = sources.length > 0 ? sources[0].src : "";
        const parent = cam.parentCollection || {};
        const roadway = parent.title || '';
        const route = parent.location?.routeDesignator || '';

        return {
            title: cam.title || '',
            uri: cam.uri || '',
            webUrl: cam.url || '',
            streamUrl: streamUrl,
            roadway: roadway,
            route: route
        };
    });

    try {
        await csvWriter.writeRecords(records);
        console.log(`Successfully saved ${records.length} cameras to '${filename}'.`);
    } catch (e) {
        console.error(`Failed to save CSV file: ${e}`);
    }
}

async function main() {
    const cameras = await fetchCameras();
    await saveToCsv(cameras);
}

main();
