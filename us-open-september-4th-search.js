#!/usr/bin/env node

import { spawn } from 'child_process';

async function searchUSOpenSept4() {
    console.log('🎾 Searching for US Open tennis events on September 4th, 2025...\n');
    
    try {
        // First, search for US Open events
        console.log('Step 1: Getting search suggestions for US Open tennis...');
        const searchProcess = spawn('npx', [
            '@modelcontextprotocol/inspector', 
            'node', 
            'dist/index.js'
        ], { 
            stdio: 'pipe',
            env: { ...process.env }
        });

        const searchQuery = JSON.stringify({
            method: 'tools/call',
            params: {
                name: 'tevo_search_suggestions',
                arguments: {
                    q: 'US Open tennis 2025'
                }
            }
        });

        searchProcess.stdin.write(searchQuery + '\n');
        searchProcess.stdin.end();

        let searchOutput = '';
        searchProcess.stdout.on('data', (data) => {
            searchOutput += data.toString();
        });

        searchProcess.stderr.on('data', (data) => {
            console.error('Search error:', data.toString());
        });

        await new Promise((resolve) => {
            searchProcess.on('close', resolve);
        });

        console.log('Search suggestions result:');
        console.log(searchOutput);
        console.log('\n' + '='.repeat(80) + '\n');

        // Now search for events specifically on September 4th, 2025
        console.log('Step 2: Searching for events on September 4th, 2025...');
        const eventsProcess = spawn('npx', [
            '@modelcontextprotocol/inspector', 
            'node', 
            'dist/index.js'
        ], { 
            stdio: 'pipe',
            env: { ...process.env }
        });

        const eventsQuery = JSON.stringify({
            method: 'tools/call',
            params: {
                name: 'tevo_list_events',
                arguments: {
                    q: 'US Open tennis',
                    'starts_at.gte': '2025-09-04T00:00:00',
                    'starts_at.lt': '2025-09-05T00:00:00'
                }
            }
        });

        eventsProcess.stdin.write(eventsQuery + '\n');
        eventsProcess.stdin.end();

        let eventsOutput = '';
        eventsProcess.stdout.on('data', (data) => {
            eventsOutput += data.toString();
        });

        eventsProcess.stderr.on('data', (data) => {
            console.error('Events error:', data.toString());
        });

        await new Promise((resolve) => {
            eventsProcess.on('close', resolve);
        });

        console.log('Events on September 4th, 2025:');
        console.log(eventsOutput);
        
    } catch (error) {
        console.error('Error searching for US Open events:', error);
    }
}

searchUSOpenSept4();