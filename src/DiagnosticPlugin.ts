import { Plugin } from '@evillite/core';

export default class DiagnosticPlugin extends Plugin {
    pluginName = 'Diagnostic';
    author = 'Dev';
    intervalId: ReturnType<typeof setInterval> | null = null;

    init() {
        this.info('Diagnostic Plugin initializing.');
        this.settings.enable.value = true;
    }

    start() {
        this.info('Diagnostic Plugin started. Scanning for engine every second...');
        
        this.intervalId = setInterval(() => {
            let foundEngine = false;
            let allEngineObjs: any[] = [];
            let diagnosticStr = '';
            
            // Try to get the GameEngine using the gameHooks
            try {
                const GameEngine = (document as any).highlite?.gameHooks?.GameEngine;
                if (GameEngine && Array.isArray(GameEngine.Instances)) {
                    for (const inst of GameEngine.Instances) {
                        if (inst && inst.scenes && Array.isArray(inst.scenes)) {
                            allEngineObjs.push(inst);
                        }
                    }
                    if (allEngineObjs.length > 0) {
                        foundEngine = true;
                        diagnosticStr += `Found ${allEngineObjs.length} Engines via gameHooks.GameEngine.Instances\n`;
                    }
                }
            } catch(e) {
                diagnosticStr += "gameHooks error: " + e + "\n";
            }

            if (!foundEngine) {
                // Fallback: Scan for engine instances in document.client
                try {
                    const clientMap = (document as any).client;
                    if (clientMap && typeof clientMap.values === 'function') {
                        for (const val of clientMap.values()) {
                            if (val && typeof val === 'function' && Array.isArray(val.Instances)) {
                                let localFound = false;
                                for (const instance of val.Instances) {
                                    if (instance && instance.scenes && Array.isArray(instance.scenes)) {
                                        allEngineObjs.push(instance);
                                        localFound = true;
                                    }
                                }
                                if (localFound) {
                                    diagnosticStr += `Found ${allEngineObjs.length} mangled Engine class in document.client\n`;
                                    foundEngine = true;
                                    break;
                                }
                            }
                        }
                    }
                } catch(e) {
                    diagnosticStr += "document.client fallback error: " + e + "\n";
                }
            }

            if (allEngineObjs.length > 0) {
                diagnosticStr += `Engines found! Total: ${allEngineObjs.length}\n`;
                
                let allTextures: any[] = [];
                let allMeshes: any[] = [];
                
                for (let i = 0; i < allEngineObjs.length; i++) {
                    const engineObj = allEngineObjs[i];
                    diagnosticStr += `Engine ${i} Scenes length: ${engineObj.scenes ? engineObj.scenes.length : 'undefined'}\n`;
                    
                    if (engineObj.scenes) {
                        for (let j = 0; j < engineObj.scenes.length; j++) {
                            const scene = engineObj.scenes[j];
                            const texNames = (scene.textures || []).map((t:any) => t.name);
                            allTextures.push(...(scene.textures || []).map((t:any) => ({
                                engineIdx: i,
                                sceneIdx: j,
                                name: t.name,
                                className: t.getClassName ? t.getClassName() : 'unknown'
                            })));
                            
                            allMeshes.push(...(scene.meshes || []).map((m:any) => ({
                                engineIdx: i,
                                sceneIdx: j,
                                name: m.name,
                                id: m.id
                            })));
                        }
                    }
                }
                
                fetch('http://localhost:8081', {
                    method: 'POST',
                    body: JSON.stringify({
                        success: true,
                        diagnostic: diagnosticStr,
                        textures: allTextures,
                        meshes: allMeshes
                    })
                }).catch(()=>{});
                
                if (this.intervalId) clearInterval(this.intervalId); // Stop scanning once found
            }
        }, 1000);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
    }
}
