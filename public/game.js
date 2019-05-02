var url = "https://palmer-jc.github.io/lib/QueuedInterpolation.1.1.min.js";
var s = document.createElement("script");
s.src = url;
document.head.appendChild(s);

//list of pressed keys
var keys = [];

// Key codes
// The commented numbers are for arrow keys
var LEFT = 65; // 37;
var UP = 87; // 38;
var RIGHT = 68; // 39;
var DOWN = 83; // 40;
var SPACE = 32;

//map coords
//var map = [];

//list of projectiles
var proj = [];

//players
var player;
var otherPlayers = {};

var decalList = [];

var playerModel;

var spawns = [{x: 243.85, y: 132, z: -218.78}, {x: -343.63, y: 132, z: 293.73}];

var healthbar;

let mousedown = false;

var createScene = function () {
    console.log("hi");
    var gravityVector = new BABYLON.Vector3(0, -100, 0);
    var physicsPlugin = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(gravityVector, physicsPlugin);
    playerModel = new Snowman_Generic3.Body("box", scene, "./Babylon/");

    healthbar = document.querySelectorAll('#health-bar .level');

    engine.runRenderLoop(function () {
        if (scene) {
            scene.render();
        }
    });

    multiplayer.init();

    //lights
    var light = new BABYLON.DirectionalLight("DirLight", new BABYLON.Vector3(-0.1, -1, 0.2), scene);
    light.specular = new BABYLON.Color3(0, 0, 0);
    light.position = new BABYLON.Vector3(300, 0, 100);
    light.shadowEnabled = true;

    var light3 = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, -1, 0), scene);
    light3.diffuse = new BABYLON.Color3(0.7, 0.7, 0.9);
    light3.specular = new BABYLON.Color3(0, 0, 0);
    light3.intensity = 0.8;

    //create ground
    let width = 1000;
    let height = 1000;

    var ground = BABYLON.Mesh.CreateGroundFromHeightMap("ground", "map2.png", width, height, 60, 0, 255 / 2, scene, false);
    let ray = new BABYLON.Ray(new BABYLON.Vector3(0, 200, 0), new BABYLON.Vector3(0, -1, 0), 400);

    Snowman_Generic3.initScene(scene);
    //ground.position.set(500, 0, 500);
    /*BABYLON.Mesh.CreateGround("ground", width, height, 80, scene, true);

    ground.position.set(0, -30, 0);

    var positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    let dx = width / map.length;
    let index = 0;
    for (var y = 0; y < 80; y++) {
        for (var x = 0; x < 80; x++) {
            positions[index + 1] = map[y][positions[index] / dx + 40];
            index += 3;
        }
    }

    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    ground.occlusionType = BABYLON.AbstractMesh.OCCLUSION_TYPE_NONE;*/

    var groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture("grid.jpg", scene);
    groundMaterial.diffuseTexture.uScale = 160 * 2;
    groundMaterial.diffuseTexture.vScale = 160 * 2;
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    groundMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
    groundMaterial.ambientColor = new BABYLON.Color3(0, 0, 0);
    ground.material = groundMaterial;

    //create player/data
    player = new Player(0, 0, 0, playerModel);
    let spawn = true;
    let team = 0;
    let lastPlayerPos = new BABYLON.Vector3();

    var flags = [new Flag(spawns[0].x, spawns[0].y, spawns[0].z, 1), new Flag(spawns[1].x, spawns[1].y, spawns[1].z, 2)];

    let gunOffset = new Vector(0, 1, 0);

    function rotateGunOffset(alpha) {
        gunOffset.x = Math.cos(alpha + Math.PI / 2);
        gunOffset.z = Math.sin(alpha + Math.PI / 2);
    }

    let startCamPos = [camera.beta, camera.alpha];
    let weaponTypes = {
        normal: function (alpha, beta) {
            rotateGunOffset(alpha);
            alpha += 0.01;
            let vel = new Vector(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
            proj.push(new Projectile(fromBabylon(player.mesh.position).add(gunOffset).add(vel.mult(-4)), vel.mult(3), team, true, 1));
        },
        machineGun: function (alpha, beta) {
            rotateGunOffset(alpha);
            alpha += 0.01;
            alpha += (Math.random() - 0.5) / 30;
            beta += (Math.random() - 0.5) / 30;
            beta += 0.04;
            let vel = new Vector(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
            let variance = -Math.random() - 1;
            proj.push(new Projectile(fromBabylon(player.mesh.position).add(gunOffset).add(vel.mult(variance)), vel.mult(-6 / variance), team, true, 0.5));
        },
        sniper: function (alpha, beta) {
            camera.angularSensibilityX = camera.angularSensibilityY = 1000;
            setTimeout(function () {
                camera.fov = 1;
            }, 100);
            let vel = new Vector(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
            proj.push(new Projectile(fromBabylon(player.mesh.position).add(gunOffset).add(vel.mult(-4)), vel.mult(300), team, true, 1));
        },
    };
    let currentType = "sniper";
    mousedown = false;
    let velOffset = [0, 0];
    let posOffset = [0, 0];

    //create projectiles on click
    document.addEventListener("mouseup", function (e) {
        mousedown = false;
        if (e.which === 3) {
            let close = [];

            let alpha = camera.alpha;
            let beta = camera.beta;
            let vec1 = new Vector(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));

            let pos2 = fromBabylon(player.mesh.position);

            for (let index = 0; index < Object.keys(otherPlayers).length; index++) {
                if (Object.keys(otherPlayers)[index] !== multiplayer.getID()) {
                    let pos1 = fromBabylon(otherPlayers[Object.keys(otherPlayers)[index]].mesh.position);
                    let vec2 = pos1.clone().sub(pos2);
                    vec2.y = vec1.y = 0;
                    if (vec2.angleTo(vec1) > 2.5) {
                        close.push([pos1, Object.keys(otherPlayers)[index]]);
                    }
                }
            }

            let closest = null;
            let bestDist = 400;
            for (let player_ in close) {
                let dist = Vector.distsq(close[player_][0], pos2);
                if (dist < bestDist) {
                    closest = close[player_];
                    bestDist = dist;
                }
            }

            if (closest !== null) {
                multiplayer.changeHealth(-10, closest[1]);
            }
        } else {
            switch (currentType) {
                case "normal":
                    weaponTypes[currentType](camera.alpha, camera.beta);
                    break;
                case "sniper":
                    weaponTypes[currentType](camera.alpha, camera.beta);
                    break;
                default:
                    break;
            }
        }
    });
    document.addEventListener("mousedown", function (e) {
        mousedown = true;
        if (e.which === 3) {
            return;
        } else {
            switch (currentType) {
                case "sniper":
                    velOffset = [0, 0];
                    camera.fov = 0.1;
                    camera.angularSensibilityX = camera.angularSensibilityY = 30000;
                    startCamPos = [camera.beta, camera.alpha];
                    posOffset = [0, 0];
                    break;
                default:
                    break;
            }
        }
    });
    document.addEventListener("mousemove", function (e) {
        if (mousedown) {
            if (e.which === 3) {
                return;
            } else {
                switch (currentType) {
                    case "sniper":
                        velOffset[1] -= e.movementX/10000;
                        velOffset[0] -= e.movementY/10000;
                        break;
                    default:
                        break;
                }
            }
        }
    });

    //update player
    var team1 = document.getElementById("team1");
    var team2 = document.getElementById("team2");

    let delay = 0;
    let flagCountDown = 0;
    var highlight = new BABYLON.HighlightLayer("hl1", scene);
    let wait = null;
    let healtime = null;
    let heal = false;

    scene.executeWhenReady(scene.registerBeforeRender(function () {
        if (mousedown) {
            switch (currentType) {
                case "machineGun":
                    if (delay % 3 === 0)
                        weaponTypes[currentType](camera.alpha, camera.beta);
                    break;
                case "sniper":
                    posOffset[1] += velOffset[1];
                    posOffset[0] += velOffset[0];
                    camera.beta = startCamPos[0] + posOffset[0];
                    camera.alpha = startCamPos[1] + posOffset[1];
                    camera.update();
                    break;
                default:
                    break;
            }
        }
        //add delay to ensure things load
        if (ground) {
            delay++;
        }
        if (delay > 100) {
            team1.innerText = multiplayer.getScores().Team1;
            team2.innerText = multiplayer.getScores().Team2;


            player.input(keys);
            player.update(ground);

            let players = multiplayer.getPlayers();
            let th = player.health;

            if (players[multiplayer.getID()] !== undefined) {
                player.health = players[multiplayer.getID()].Health;
            }

            if (player.health < th) {
                heal = false;
                clearTimeout(wait);
                clearInterval(healtime);
                wait = setTimeout(function () {
                    heal = true;
                }, 1000);
            }

            if (player.health >= 100) {
                heal = false;
                clearInterval(healtime);
            }
            if (heal) {
                heal = false;
                healtime = setInterval(function () {
                    if (players[multiplayer.getID()].Health >= 100) {
                        clearInterval(healtime);
                    } else {
                        multiplayer.changeHealth(1, multiplayer.getID());
                    }
                }, 1000);
            }
            let color;
            if (player.health < 15) color = "#e74c3c"; else if (player.health < 50) color = "#f39c12"; else color = "#2ecc71";
            healthbar[0].style.left = "-" + (100 - player.health) + "%";
            healthbar[0].style.background = color;
            document.querySelectorAll("#health-text")[0].innerHTML = player.health;
            document.querySelectorAll("#health")[0].style.color = color;
            document.querySelectorAll('#armor-bar .level')[0].style.left = "-" + (160 - player.maxSpeed) / 1.6 + "%";
            document.querySelectorAll("#armor-text")[0].innerHTML = player.maxSpeed;

            if (player.health <= 0) {
                spawn = true;
                multiplayer.changeHealth(-player.health + 100, multiplayer.getID());
            }

            //broadcast decals/projectiles info
            for (var i = 0; i < proj.length; i++) {
                let id = proj[i].update(ground, scene, otherPlayers, players, decalList);
                if (id === -2) {
                    multiplayer.broadcast("-2" + multiplayer.getID(), proj[i].pos.x, proj[i].pos.y, proj[i].pos.z, proj[i].vel.x, proj[i].vel.y, proj[i].vel.z, proj[i].type);
                } else if (id !== 0 && id !== -1) {
                    multiplayer.broadcast(id.pickedMesh.tempID, id.pickedPoint.x, id.pickedPoint.y, id.pickedPoint.z, team, 0, 0, proj[i].type);
                    proj.splice(i, 1);
                    console.log(id.pickedMesh.tempID)
                } else if (id === -1) {
                    multiplayer.broadcast("-1" + multiplayer.getID(), proj[i].pos.x, proj[i].pos.y, proj[i].pos.z, 0, 0, 0, proj[i].type);
                    proj.splice(i, 1);
                }
            }

            //get broadcasted decals/projectiles
            let broadDecals = multiplayer.getBroadcasts();
            if (Object.keys(broadDecals).length > 0) {
                for (let dec2 in broadDecals) {
                    let dec = broadDecals[dec2];
                    let pos = new BABYLON.Vector3(dec.Coordinates.X, dec.Coordinates.Y, dec.Coordinates.Z);
                    if (dec.ID.slice(0, 2) === "-2" & dec.ID !== "-2" + multiplayer.getID()) {
                        let tvel = new BABYLON.Vector3(dec.Vel.X, dec.Vel.Y, dec.Vel.Z);
                        proj.push(new Projectile(pos, tvel, team, false, dec.Size));
                    } else if (dec.ID.slice(0, 2) !== "-1" && dec.ID !== '') {
                        if (dec.ID === multiplayer.getID()) {
                            console.log(dec.ID)
                            if (dec.Vel.X === team) {
                                player.friendHit();
                                console.log("fh");
                            } else {
                                player.enemyHit();
                            }
                        } else if (otherPlayers[dec.ID]) {
                            decalList.push(new Decal(pos, (Vector.sub(fromBabylon(otherPlayers[dec.ID].mesh.position), fromBabylon(pos)).normalize()).toBabylon(), otherPlayers[dec.ID].mesh, scene));
                        }
                    } else if (dec.ID !== 0 && dec.ID !== '' && dec.ID !== "-1" + multiplayer.getID()) {
                        var decalMaterial = new BABYLON.StandardMaterial("decalMat", scene);
                        decalMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
                        decalMaterial.zOffset = -2;
                        var decalSize = new BABYLON.Vector3(10, 10, 10);
                        var decal = BABYLON.MeshBuilder.CreateDecal("decal", ground, {
                            position: pos,
                            normal: ground.getNormalAtCoordinates(pos.x, pos.z),
                            size: decalSize
                        }, scene);
                        decal.material = decalMaterial;
                    }
                }
            }

            let flagsEvents = multiplayer.getFlagEvents();
            //update player list and positions
            if (players) {
                let s = Object.keys(players);
                let s2 = Object.keys(otherPlayers);
                if (!arraysEqual(s2, s)) {
                    for (let i = 0; i < s.length; i++) {
                        let found = false;
                        for (let j = 0; j < s2.length; j++) {
                            if (s[i] === s2[j])
                                found = true;
                        }
                        if (!found) {
                            if (players[s[i]].Team === 1)
                                otherPlayers[s[i]] = new OtherPlayer(0, 0, 0, 0, s[i], "", 1, playerModel, scene);
                            else
                                otherPlayers[s[i]] = new OtherPlayer(0, 0, 0, 0, s[i], "", 2, playerModel, scene);
                            /*if (s[i] === multiplayer.getID()) {
                                otherPlayers[s[i]].mesh.dispose();
                                advancedTexture.removeControl(otherPlayers[s[i]].healthbar);
                                otherPlayers[s[i]].healthbar.dispose();
                                advancedTexture.removeControl(otherPlayers[s[i]].label);
                                otherPlayers[s[i]].label.dispose();
                            }*/
                        }
                    }
                    for (let i = 0; i < s2.length; i++) {
                        let found = false;
                        for (let j = 0; j < s.length; j++) {
                            if (s[j] === s2[i])
                                found = true;
                        }
                        if (!found) {
                            otherPlayers[s2[i]].mesh.dispose();
                            /*advancedTexture.removeControl(otherPlayers[s2[i]].healthbar);
                            otherPlayers[s2[i]].healthbar.dispose();
                            advancedTexture.removeControl(otherPlayers[s2[i]].label);
                            otherPlayers[s2[i]].label.dispose();*/
                            delete otherPlayers[s2[i]];
                        }
                    }
                }
                let index = 0;

                for (let player_ in players) {
                    let tid = Object.keys(players)[index];
                    if (tid !== multiplayer.getID()) {
                        if (flagsEvents.Action === 1) {
                            if (flagsEvents.Flag < 0) {
                                flags[-flagsEvents.Flag - 1] = new Flag(spawns[-flagsEvents.Flag - 1].x, spawns[-flagsEvents.Flag - 1].y, spawns[-flagsEvents.Flag - 1].z, -flagsEvents.Flag)
                            } else if (flagsEvents.ID === tid) {
                                flags[flagsEvents.Flag].taken(otherPlayers[tid].team, otherPlayers[tid].mesh, tid);
                                //otherPlayers[tid].hasFlag = true;
                            }
                        } else if (flagsEvents.Action === 0) {
                            if (flagsEvents.Flag < 0) {
                                flags[-flagsEvents.Flag - 1].mesh.dispose();
                                flags[-flagsEvents.Flag - 1] = new Flag(spawns[-flagsEvents.Flag - 1].x, spawns[-flagsEvents.Flag - 1].y, spawns[-flagsEvents.Flag - 1].z, -flagsEvents.Flag)
                            } else {
                                flags[flagsEvents.Flag].pmesh = null;
                                //flags[flagsEvents.Flag].moved = false;
                                flags[flagsEvents.Flag].hold = false;
                                flags[flagsEvents.Flag].id = 0;
                                flags[flagsEvents.Flag].count = 0;
                            }
                        }
                        otherPlayers[tid].move();
                        otherPlayers[tid].health = players[player_].Health;
                        otherPlayers[tid].mesh.position = new BABYLON.Vector3(players[player_]["X"] + 1, players[player_]["Y"] + 2, players[player_]["Z"] - 0.5);
                        //otherPlayers[Object.keys(players)[index]].mesh.rotate(-otherPlayers[Object.keys(players)[index]].alpha + players[player_]["Orientation"]);
                        let deltar = otherPlayers[tid].alpha - players[player_]["Orientation"];
                        otherPlayers[tid].mesh.rotate(BABYLON.Axis.Y, deltar, BABYLON.Space.WORLD);
                        otherPlayers[tid].alpha = players[player_]["Orientation"];
                        otherPlayers[tid].mesh.deltar = deltar;
                        //console.log(players[player_]["Orientation"])
                    } else {
                        otherPlayers[Object.keys(players)[index]].mesh.position = new BABYLON.Vector3(0, -100, -100);
                        if (spawn) {
                            /*if (flags[0].id === multiplayer.getID()) {
                                multiplayer.lostFlag(0);
                                //console.log('test3')
                                flags[0].pmesh = null;
                                //flags[i].moved = false;
                                flags[0].hold = false;
                                flags[0].id = 0;
                                flags[0].count = 0;
                            }
                            if (flags[1].id === multiplayer.getID()) {
                                multiplayer.lostFlag(1);
                                //console.log('test3')
                                flags[1].pmesh = null;
                                //flags[i].moved = false;
                                flags[1].hold = false;
                                flags[1].id = 0;
                                flags[1].count = 0;
                            }*/
                            team = players[multiplayer.getID()].Team;
                            lastPlayerPos = player.mesh.position;
                            //setTimeout(function () {
                            //console.log(team)
                            player.fall = false;
                            player.mesh.position.y = 100000 + player.mesh.position.y;

                            //}, 50);
                            spawn = false;
                            setTimeout(function () {
                                //console.log(team)
                                player.fall = true;
                                player.mesh.position = new BABYLON.Vector3(spawns[team - 1].x, spawns[team - 1].y, spawns[team - 1].z);

                            }, 1000);
                        }
                    }
                    index++;
                }
                //console.log(player.mesh.position);

                if (team > 0) {
                    for (let i = 0; i < flags.length; i++) {
                        flags[i].update();
                        //console.log(flags[i]);
                        if (!flags[i].hold) {
                            //console.log("not held");
                            if (i !== team - 1) {
                                //console.log(flags[i].count);
                                let dist = (player.pos.x - flags[i].mesh.position.x) * (player.pos.x - flags[i].mesh.position.x) + (player.pos.z - flags[i].mesh.position.z) * (player.pos.z - flags[i].mesh.position.z);
                                //console.log(flags[i].count, dist)
                                if (dist < 200) {
                                    flags[i].count++;
                                    //console.log("count: " + flags[i].count);
                                } else if (flags[i].count > 0) {
                                    flags[i].count -= 2;
                                }
                                if (flags[i].count >= 50) {
                                    flags[i].taken(team, player.mesh, multiplayer.getID());
                                    multiplayer.gotFlag(i);
                                }
                            } else {
                                let dist = (player.pos.x - flags[i].mesh.position.x) * (player.pos.x - flags[i].mesh.position.x) + (player.pos.z - flags[i].mesh.position.z) * (player.pos.z - flags[i].mesh.position.z);
                                //console.log(dist, flags[i].moved);
                                if (dist < 200 && flags[i].moved && player.pos.y < 10000) {
                                    flags[i].taken(team, player.mesh, multiplayer.getID());
                                    multiplayer.gotFlag(i);
                                }
                            }
                        } else {
                            //console.log("held");
                            if (i !== team - 1) {
                                if (player.health <= 0 && flags[i].id === multiplayer.getID()) {
                                    multiplayer.lostFlag(i);
                                    //console.log('test3')
                                    flags[i].pmesh = null;
                                    //flags[i].moved = false;
                                    flags[i].hold = false;
                                    flags[i].id = 0;
                                    flags[i].count = 0;
                                }
                                let dist2 = (player.pos.x - spawns[1 - i].x) * (player.pos.x - spawns[1 - i].x) + (player.pos.z - spawns[1 - i].z) * (player.pos.z - spawns[1 - i].z);
                                if (dist2 < 200 && flags[i].id === multiplayer.getID()) {
                                    //console.log('test2')
                                    multiplayer.updateScore();
                                    multiplayer.lostFlag(-(i + 1));
                                    flags[i].mesh.dispose();
                                    flags[i] = new Flag(spawns[i].x, spawns[i].y, spawns[i].z, i + 1);
                                    //flags[i].updatePosition(spawns[i].x, spawns[i].y, spawns[i].z)
                                }
                            } else {
                                let dist = (player.pos.x - spawns[i].x) * (player.pos.x - spawns[i].x) + (player.pos.z - spawns[i].z) * (player.pos.z - spawns[i].z);
                                if (dist < 200 && flags[i].id === multiplayer.getID()) {
                                    //console.log('test')
                                    multiplayer.lostFlag(-(i + 1));
                                    flags[i].mesh.dispose();
                                    flags[i] = new Flag(spawns[i].x, spawns[i].y, spawns[i].z, i + 1);
                                }
                                if (player.health <= 0 && flags[i].id === multiplayer.getID()) {
                                    multiplayer.lostFlag(i);
                                    //console.log('test4')
                                    flags[i].updatePosition(lastPlayerPos.x, lastPlayerPos.y, lastPlayerPos.z);
                                    flags[i].pmesh = null;
                                    //flags[i].moved = false;
                                    flags[i].hold = false;
                                    flags[i].id = 0;
                                    flags[i].count = 0;
                                }
                            }
                        }
                    }
                    /*let dist = (player.pos.x - spawns[i].x) * (player.pos.x - spawns[i].x) + (player.pos.z - spawns[i].z) * (player.pos.z - spawns[i].z);
                    if (dist < 200) {
                        flagCountDown++;
                    }
                    if (flagCountDown === 1) {
                        highlight.addMesh(flags[i].mesh, new BABYLON.Color3(i, i, 1 - i));
                    }
                    if (flagCountDown === 0) {
                        highlight.removeMesh(flags[i].mesh);
                    }
                    if (dist > 200 && flagCountDown > 0) {
                        flagCountDown -= 2;
                    }
                    if (flagCountDown > 50) {
                        highlight.removeMesh(flags[i].mesh);
                        flags[i].taken(team, player.mesh);
                        multiplayer.gotFlag(i);
                    }
                    if (player.health <= 0) {
                        multiplayer.lostFlag(i);
                    }
                    let dist2 = (player.pos.x - spawns[1 - i].x) * (player.pos.x - spawns[1 - i].x) + (player.pos.z - spawns[1 - i].z) * (player.pos.z - spawns[1 - i].z);
                    if (dist2 < 200 && flags[i].taken) {
                        if (i !== team - 1) {
                            /*setTimeout(function () {
                                flags[2 - team].updatePosition(spawns[2 - team].x, spawns[2 - team].y, spawns[1].z)
                            }, 30);
                            flags[i] = new Flag(spawns[i].x, spawns[i].y, spawns[i].z, i + 1)
                            flagCountDown = 0;
                            multiplayer.updateScore();
                        } else {
                            multiplayer.gotFlag(-(i + 1));
                        }
                    }
                }*/
                }
            }

            //move decals with player
            for (var l = 0; l < decalList.length; l++) {
                if (decalList[l].update()) decalList.splice(l, 1);
            }

            //send client player info
            multiplayer.setPosition(player.mesh.position.x, player.mesh.position.y, player.mesh.position.z);
            multiplayer.setOrientation(camera.alpha);
            multiplayer.sendPlayerData();
            camera.radius = 0.001;
        }
    }));
    return scene;
};
setTimeout(createScene, 10000);
var multiplayer = new MMOC();

var canvas = document.getElementById("renderCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true});
var scene = new BABYLON.Scene(engine);

//camera
var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 200, new BABYLON.Vector3.Zero(), scene);
camera.setTarget(new BABYLON.Vector3(0, 0, 0));
camera.attachControl(canvas, true);
camera.keysDown = camera.keysUp = camera.keysLeft = camera.keysRight = [];
camera.radius = 0.001;
camera.maxZ = 1000;
camera.fov = 1;

//console.log(camera);

//asset loader
/*var assetsManager = new BABYLON.AssetsManager(scene);
assetsManager.onTaskErrorObservable.add(function (task) {
    console.log('task failed', task.errorObject.message, task.errorObject.exception);
});
assetsManager.onProgress = function (remainingCount, totalCount, lastFinishedTask) {
    engine.loadingUIText = 'We are loading the scene. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.';
};
assetsManager.onFinish = function (tasks) {
    createScene();
    healthbar = document.querySelectorAll('#health-bar .level');

    engine.runRenderLoop(function () {
        if (scene) {
            scene.render();
        }
    });

    multiplayer.init();
};

/* a
//load map image and create coordinate map
var imageTask = assetsManager.addImageTask("image task", "map2.png");
imageTask.onSuccess = function (task) {
    var canvas = document.createElement('canvas');
    canvas.width = task.image.width;
    canvas.height = task.image.height;
    let context = canvas.getContext('2d');
    context.drawImage(task.image, 0, 0, task.image.width, task.image.height);
    let mapData = context.getImageData(0, 0, task.image.width, task.image.height);
    for (var y = 0; y < task.image.width; y++) {
        let temp = [];
        for (var x = 0; x < task.image.height; x++) {
            //double positions to make level planes
            temp.push(mapData.data[y * (task.image.width * 4) + x * 4]);
            temp.push(mapData.data[y * (task.image.width * 4) + x * 4]);
        }
        map.push(temp);
        map.push(temp);
    }
};

/*var playerTask = assetsManager.addMeshTask("player task", "", "./Babylon/", "Snowman-Generic3.babylon");
playerTask.onSuccess = function (task) {
    console.log(task.loadedMeshes);
    for (let i = 0; i < task.loadedMeshes.length; i++) {
        if (i !== 8 && i !== 1) {
            //task.loadedMeshes[i].position
        }
        //8,1 arms
        //9 hat
        //2 body
        //0 nose
    }
    task.loadedMeshes[0].position.y /= 2;
    task.loadedMeshes[0].position.x *= -1;
    task.loadedMeshes[0].position.z *= -1;
    task.loadedMeshes[0].parent = task.loadedMeshes[2];
    task.loadedMeshes[9].parent = task.loadedMeshes[2];
    task.loadedMeshes[1].parent = task.loadedMeshes[2];
    task.loadedMeshes[8].parent = task.loadedMeshes[2];

    //task.loadedMeshes[2].position.x = 20;
    //task.loadedMeshes[0].material.ambientColor = new BABYLON.Color3(1, 1, 1);
    //playerModel = task.loadedMeshes[0];

};
/*var playerTask = assetsManager.addMeshTask("player task", "", "./Babylon", "snowman.babylon");
playerTask.onSuccess = function (task) {
    //console.log(task.loadedMeshes[0]);
    task.loadedMeshes[0].position = BABYLON.Vector3.Zero();
    //task.loadedMeshes[0].rotation = new BABYLON.Vector3(-2 * Math.PI / 3, 0, -1.2);
    task.loadedMeshes[0].material.ambientColor = new BABYLON.Color3(1, 1, 1);
    //playerModel = task.loadedMeshes[0];
};

assetsManager.load();*/

// Resize
window.addEventListener("resize", function () {
    engine.resize();
});

//update key list
document.addEventListener("keydown", function (e) {
    keys[e.keyCode] = true;
});
document.addEventListener("keyup", function (e) {
    keys[e.keyCode] = false;
});

canvas.addEventListener("click", function (e) {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
    if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
}, false);

document.addEventListener("click", function (e) {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
    if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
}, false);

var pointerlockchange = function (e) {
    let enabled = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);

    if (enabled) {
        camera.attachControl(canvas);
    } else {
        camera.detachControl(canvas);
    }
};

document.addEventListener("pointerlockchange", pointerlockchange, false);
document.addEventListener("mspointerlockchange", pointerlockchange, false);
document.addEventListener("mozpointerlockchange", pointerlockchange, false);
document.addEventListener("webkitpointerlockchange", pointerlockchange, false);

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    a.sort();
    b.sort();

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}




// File generated with Tower of Babel version: 5.3-beta on 04/26/19
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Snowman_Generic3;
(function (Snowman_Generic3) {
    var _B = BABYLON;
    var _M = _B.Matrix.FromValues;
    var _Q = _B.Quaternion;
    var _V = _B.Vector3;
    function CONTIG(array, offset, begin, end) {
        for(var i = 0, len = 1 + end - begin; i < len; i++) {
            array[offset + i] = begin + i;
        }
    }
    function REPEAT(array, offset, nRepeats, val) {
        for(var i = 0; i < nRepeats; i++) {
            array[offset + i] = val;
        }
    }
    var _sceneTransitionName;
    var _overriddenMillis;
    var _overriddenSound;
    var _options;

    function initScene(scene, resourcesRootDir, positionOffset, sceneTransitionName, overriddenMillis, overriddenSound, options) {
        if (!resourcesRootDir) { resourcesRootDir = "./"; }
        function MOVE(mesh, positionOffset) {
            mesh.position.addInPlace(positionOffset);
            if (mesh.isWorldMatrixFrozen) mesh.freezeWorldMatrix();
        }

        _sceneTransitionName = sceneTransitionName;
        _overriddenMillis    = overriddenMillis;
        _overriddenSound     = overriddenSound;
        _options             = options;

        scene.autoClear = true;
        scene.clearColor    = new _B.Color3(.0509,.0509,.0509);
        scene.ambientColor  = new _B.Color3(0,0,0);
        scene.gravity = new _V(0,-9.81,0);

        // define materials before meshes
        defineMaterials(scene, resourcesRootDir);

        // instance all root meshes
        var mesh;
        mesh = new Body("Body", scene);
        if (positionOffset) MOVE(mesh, positionOffset);

        // define cameras after meshes, incase LockedTarget is in use
        defineCameras(scene, positionOffset);

        // lights defined after meshes, so shadow gen's can also be defined
        defineLights(scene, positionOffset);

        if (sceneTransitionName && matLoaded) {
            QI.SceneTransition.perform(sceneTransitionName, waitingMeshes, overriddenMillis, overriddenSound, options);
        }
    }
    Snowman_Generic3.initScene = initScene;

    var waitingMeshes = [];
    var pendingTextures = 0;
    var texLoadStart = 0;
    function onTexturesLoaded(){
        if (--pendingTextures > 0) return;
        _B.Tools.Log("Texture Load delay:  " + ((_B.Tools.Now - texLoadStart) / 1000).toFixed(2) + " secs");
        if (_sceneTransitionName) QI.SceneTransition.perform(_sceneTransitionName, waitingMeshes, _overriddenMillis, _overriddenSound, _options);
        else {
            for (var i = 0, len = waitingMeshes.length; i < len; i++) {
                if (!waitingMeshes[i].initComplete) continue;
                if (typeof waitingMeshes[i].grandEntrance == "function") waitingMeshes[i].grandEntrance();
                else makeVisible(waitingMeshes[i]);
            }
        }
        waitingMeshes = [];
        _sceneTransitionName = null;
        matLoaded = true;
    }

    // QI.Mesh has similar method, using this to not require QI
    function makeVisible(mesh){
        var children = mesh.getChildMeshes();
        mesh.isVisible = true;
        for (var i = 0, len = children.length; i < len; i++) {
            children[i].isVisible = true;
        }
    }

    var aheadQueued = false;
    function matReadAhead(materialsRootDir) {
        if (aheadQueued) return;
        var txBuffer;
        var fName;

        fName = "Snowman_Generic3_Body_DIFFUSE.jpg";
        if (!TOWER_OF_BABEL.Preloader.findTextureBuffer(fName)) {
            txtBuffer = new TOWER_OF_BABEL.TextureBuffer(materialsRootDir, fName);
            txtBuffer.hasAlpha = false;
            txtBuffer.level = 1;
            txtBuffer.coordinatesIndex = 0;
            txtBuffer.coordinatesMode = 0;
            txtBuffer.uOffset = 0;
            txtBuffer.vOffset = 0;
            txtBuffer.uScale = 1;
            txtBuffer.vScale = 1;
            txtBuffer.uAng = 0;
            txtBuffer.vAng = 0;
            txtBuffer.wAng = 0;
            txtBuffer.wrapU = 0;
            txtBuffer.wrapV = 0;
            pendingTextures++;
            TOWER_OF_BABEL.Preloader.addtextureBuffer(txtBuffer);
        }

        aheadQueued = true;
    }
    Snowman_Generic3.matReadAhead = matReadAhead;

    var matLoaded = false;
    function defineMaterials(scene, materialsRootDir) {
        if (!materialsRootDir) { materialsRootDir = "./"; }
        if (materialsRootDir.lastIndexOf("/") + 1  !== materialsRootDir.length) { materialsRootDir  += "/"; }
        if (typeof(QI) !== "undefined") QI.TimelineControl.initialize(scene);
        if (typeof(TOWER_OF_BABEL) !== "undefined") TOWER_OF_BABEL.Preloader.SCENE = scene;
        var loadStart = _B.Tools.Now;
        matReadAhead(materialsRootDir);
        var material;
        var texture;
        var txBuffer;

        material = scene.getMaterialByID("Snowman_Generic3.Body");
        if (!material){
            material = new _B.StandardMaterial("Snowman_Generic3.Body", scene);
            material.ambientColor  = new _B.Color3(0,0,0);
            material.diffuseColor  = new _B.Color3(.8,.8,.8);
            material.emissiveColor = new _B.Color3(0,0,0);
            material.specularColor = new _B.Color3(1,1,1);
            material.specularPower = 64;
            material.alpha =  1;
            material.backFaceCulling = true;
            material.checkReadyOnlyOnce = false;
            material.maxSimultaneousLights = 4;
            txtBuffer = TOWER_OF_BABEL.Preloader.findTextureBuffer("Snowman_Generic3_Body_DIFFUSE.jpg");
            txtBuffer.applyWhenReady(material, TOWER_OF_BABEL.TextureBuffer.DIFFUSE_TEX, onTexturesLoaded);
        } else material.markDirty();

        material = scene.getMaterialByID("Snowman_Generic3.ArmR");
        if (!material){
            material = new _B.StandardMaterial("Snowman_Generic3.ArmR", scene);
            material.ambientColor  = new _B.Color3(0,0,0);
            material.diffuseColor  = new _B.Color3(.8,.8,.8);
            material.emissiveColor = new _B.Color3(0,0,0);
            material.specularColor = new _B.Color3(1,1,1);
            material.specularPower = 64;
            material.alpha =  1;
            material.backFaceCulling = true;
            material.checkReadyOnlyOnce = false;
            material.maxSimultaneousLights = 4;
        } else material.markDirty();

        material = scene.getMaterialByID("Snowman_Generic3.ArmL");
        if (!material){
            material = new _B.StandardMaterial("Snowman_Generic3.ArmL", scene);
            material.ambientColor  = new _B.Color3(0,0,0);
            material.diffuseColor  = new _B.Color3(.8,.8,.8);
            material.emissiveColor = new _B.Color3(0,0,0);
            material.specularColor = new _B.Color3(1,1,1);
            material.specularPower = 64;
            material.alpha =  1;
            material.backFaceCulling = true;
            material.checkReadyOnlyOnce = false;
            material.maxSimultaneousLights = 4;
        } else material.markDirty();

        matLoaded = pendingTextures === 0;
        if (!matLoaded) texLoadStart = _B.Tools.Now;
        _B.Tools.Log("Snowman_Generic3.defineMaterials completed:  " + ((_B.Tools.Now - loadStart) / 1000).toFixed(2) + " secs");
    }
    Snowman_Generic3.defineMaterials = defineMaterials;

    var Body = (function (_super) {
        __extends(Body, _super);
        function Body(name, scene, materialsRootDir, source) {
            _super.call(this, name, scene, null, source, true);

            if (!materialsRootDir) { materialsRootDir = "./"; }
            defineMaterials(scene, materialsRootDir); //embedded version check
            var cloning = source && source !== null;
            var load = _B.Tools.Now;
            var geo = 0;
            var shape = 0;
            this.position.x  = 0;
            this.position.y  = 1.5333;
            this.position.z  = 0;
            this.rotation.x  = .4587;
            this.rotation.y  = .2737;
            this.rotation.z  = -.1336;
            this.scaling.x   = 1.1986;
            this.scaling.y   = 1.1986;
            this.scaling.z   = 1.1986;
            this.ArmR = cloning ? child_ArmR(scene, this, source.ArmR) : child_ArmR(scene, this);
            this.ArmL = cloning ? child_ArmL(scene, this, source.ArmL) : child_ArmL(scene, this);

            this.id = this.name;
            this.billboardMode  = 0;
            this.isVisible  = false; //always false; evaluated again at bottom
            this.setEnabled(true);
            this.checkCollisions = false;
            this.receiveShadows  = false;
            this.castShadows  = false;
            this.initComplete = false;
            if (!cloning){
                geo = _B.Tools.Now;
                this.setVerticesData(_B.VertexBuffer.PositionKind, new Float32Array([
                        0,-1,0,.4253,-.8507,-.309,-.1625,-.8507,-.5,.7236,-.4472,-.5257,.8506,-.5257,0,-.5257,-.8507,0,-.1625,-.8507,.5,.4253,-.8507,.309,.9511,0,-.309,-.2764,-.4472,-.8506,.2629,-.5257,-.809,0,0,-1,-.8944,-.4472,0,-.6882,-.5257,-.5,-.9511,0,-.309,-.2764,-.4472,.8506,-.6882,-.5257,.5
                        ,-.5878,0,.809,.7236,-.4472,.5257,.2629,-.5257,.809,.5878,0,.809,.5878,0,-.809,-.5878,0,-.809,-.9511,0,.309,0,0,1,.9511,0,.309,.2764,.4472,-.8506,.6882,.5257,-.5,.1625,.8507,-.5,-.7236,.4472,-.5257,-.2629,.5257,-.809,-.4253,.8507,-.309,-.7236,.4472,.5257,-.8506,.5257,0
                        ,-.4253,.8507,.309,.2764,.4472,.8506,-.2629,.5257,.809,.1625,.8507,.5,.8944,.4472,0,.6882,.5257,.5,.5257,.8507,0,0,1,0,-.1723,.4547,-.5677,.1233,.5585,-.7825,-.2852,.5585,-.9152,.3306,.8389,-.9331,.4189,.7843,-.5677,-.5377,.5585,-.5677,-.2852,.5585,-.2202,.1233,.5585,-.353,.4887,1.1497,-.7825
                        ,-.3644,.8389,-1.159,.0104,.7843,-1.13,-.1723,1.1497,-1.2628,-.794,.8389,-.5677,-.6506,.7843,-.9152,-.8333,1.1497,-.7825,-.3644,.8389,.0235,-.6506,.7843,-.2202,-.5809,1.1497,-.0055,.3306,.8389,-.2023,.0104,.7843,-.0055,.2362,1.1497,-.0055,.2362,1.1497,-1.13,-.5809,1.1497,-1.13,-.8333,1.1497,-.353,-.1723,1.1497,.1273,.4887,1.1497,-.353
                        ,.0198,1.4605,-1.159,.306,1.5151,-.9152,-.0594,1.7409,-.9152,-.6753,1.4605,-.9331,-.355,1.5151,-1.13,-.4679,1.7409,-.7825,-.6753,1.4605,-.2023,-.7636,1.5151,-.5677,-.4679,1.7409,-.353,.0198,1.4605,.0235,-.355,1.5151,-.0055,-.0594,1.7409,-.2202,.4493,1.4605,-.5677,.306,1.5151,-.2202,.1931,1.7409,-.5677,-.1723,1.8447,-.5677,.3206,-2.1392,1.0563
                        ,.8493,-2.0142,.765,.2744,-2.2547,.4526,1.1752,-1.6272,.4128,1.1649,-1.4387,.9996,-.2676,-2.1286,.8724,-.0277,-1.8103,1.4443,.6626,-1.7396,1.3779,1.2873,-1.0225,.454,.1971,-2.0363,-.1187,.7767,-1.9538,.0744,.4725,-1.5813,-.4303,-.725,-1.8218,.5956,-.3402,-2.0681,.1818,-.7598,-1.5259,.0559,-.3169,-1.2802,1.5685,-.6423,-1.6237,1.1734,-.7066,-.9329,1.2406
                        ,.8575,-1.1599,1.4555,.2879,-1.2347,1.6789,.5586,-.6217,1.4867,1.0474,-1.3408,-.1179,-.2178,-1.6519,-.3639,-.9465,-1.2512,.6688,-.1317,-.6924,1.5531,1.1006,-.7478,1.0669,.6577,-.9935,-.4457,.9831,-.65,-.0506,.3685,-.4634,-.3215,-.5167,-1.1137,-.3327,.0529,-1.039,-.5561,-.3218,-.5341,-.2551,-.8344,-.6465,.7099,-.8241,-.835,.1231,-.5085,-.2595,.3578
                        ,.1437,-.2374,1.2414,-.4359,-.3199,1.0484,.0664,-.019,.6702,1.0658,-.4519,.5272,.681,-.2055,.941,.6084,-.1451,.2504,.0202,-.1345,.0664,.4077,1.3344,-.3255,1.1201,1.4624,-.3036,.4115,1.3125,-.3172,.4163,1.2896,-.3132,.4221,1.2666,-.3139,.4286,1.2443,-.3191,.4355,1.2237,-.3286,.4426,1.2055,-.3421,.4496,1.1904,-.3591,.4563,1.1791,-.3788
                        ,.4623,1.1718,-.4006,.4675,1.169,-.4236,.4716,1.1707,-.447,.4745,1.1768,-.4697,.4761,1.1872,-.491,.4763,1.2014,-.51,.4751,1.2189,-.5261,.4726,1.239,-.5385,.4688,1.2609,-.5468,.4639,1.2838,-.5507,.4582,1.3068,-.5501,.4517,1.3291,-.5449,.4448,1.3497,-.5354,.4377,1.3679,-.5219,.4306,1.383,-.5049,.424,1.3944,-.4851,.418,1.4016,-.4633
                        ,.4128,1.4044,-.4403,.4087,1.4027,-.417,.4058,1.3966,-.3943,.4042,1.3862,-.373,.404,1.372,-.3539,.4052,1.3545,-.3379,.9002,.0613,.2274,.8495,.0493,.2554,.9047,.0724,.2854,.8182,.0121,.2892,.8192,-.006,.2329,.9567,.0603,.2451,.9337,.0297,.1902,.8674,.0229,.1966,.8074,-.046,.2853,.9121,.0514,.3403,.8564,.0435,.3217
                        ,.8857,.0077,.3702,1.0006,.0308,.2717,.9637,.0545,.3114,1.004,.0024,.3235,.9615,-.0212,.1783,.9927,.0118,.2162,.9989,-.0546,.2097,.8487,-.0328,.1891,.9034,-.0256,.1677,.8774,-.0844,.1861,.8305,-.0154,.3402,.9519,.0145,.3638,1.0219,-.024,.2647,.9437,-.0776,.1797,.8253,-.0723,.2264,.8679,-.0487,.3717,.8366,-.0817,.3337
                        ,.8956,-.0996,.3597,.9806,-.0372,.3608,.9259,-.0444,.3823,.9619,-.0928,.3534,1.0111,-.0821,.2607,1.0102,-.064,.3171,.9799,-.1192,.2945,.9172,-.1213,.2097,.9729,-.1134,.2282,.9247,-.1423,.2645,.8287,-.1007,.2783,.8656,-.1244,.2385,.8726,-.1302,.3048,.9291,-.1312,.3225,.8718,.4422,.0481,.8211,.4302,.0761,.8763,.4533,.1061
                        ,.7898,.393,.1099,.7908,.3749,.0535,.9283,.4412,.0657,.9053,.4106,.0108,.839,.4038,.0172,.779,.335,.1059,.8837,.4323,.1609,.828,.4244,.1424,.8572,.3886,.1908,.9722,.4117,.0923,.9353,.4354,.1321,.9756,.3833,.1441,.933,.3597,-.0011,.9643,.3927,.0368,.9705,.3264,.0304,.8203,.3482,.0097,.875,.3553,-.0117
                        ,.849,.2965,.0068,.802,.3655,.1608,.9235,.3954,.1845,.9935,.3569,.0853,.9153,.3033,.0004,.7969,.3086,.0471,.8395,.3322,.1923,.8082,.2992,.1544,.8672,.2813,.1804,.9522,.3437,.1815,.8975,.3365,.2029,.9335,.2881,.174,.9827,.2989,.0813,.9817,.317,.1377,.9514,.2617,.1152,.8888,.2596,.0303,.9445,.2675,.0488
                        ,.8962,.2386,.0852,.8003,.2802,.0989,.8372,.2565,.0592,.8442,.2507,.1255,.9007,.2497,.1431,.6958,.7646,-.15,.6451,.7526,-.1221,.7003,.7757,-.0921,.6138,.7155,-.0882,.6148,.6974,-.1446,.7523,.7636,-.1324,.7293,.733,-.1873,.663,.7263,-.1809,.603,.6574,-.0922,.7077,.7548,-.0372,.6521,.7468,-.0557,.6813,.7111,-.0073
                        ,.7963,.7342,-.1058,.7593,.7578,-.0661,.7996,.7057,-.054,.7571,.6822,-.1992,.7883,.7151,-.1613,.7945,.6488,-.1677,.6443,.6706,-.1884,.699,.6778,-.2098,.673,.6189,-.1914,.6261,.688,-.0373,.7475,.7178,-.0137,.8175,.6794,-.1128,.7393,.6257,-.1977,.6209,.631,-.151,.6635,.6546,-.0058,.6322,.6216,-.0437,.6912,.6037,-.0177
                        ,.7763,.6662,-.0166,.7216,.659,.0048,.7575,.6105,-.0241,.8068,.6213,-.1168,.8058,.6394,-.0604,.7755,.5841,-.083,.7128,.582,-.1678,.7685,.5899,-.1493,.7203,.561,-.113,.6243,.6026,-.0992,.6612,.579,-.139,.6682,.5732,-.0726,.7247,.5721,-.055,.381,1.4879,-.7624,.3302,1.4759,-.7345,.3854,1.499,-.7045,.2989,1.4387,-.7007
                        ,.2999,1.4206,-.757,.4375,1.4869,-.7448,.4144,1.4563,-.7997,.3481,1.4495,-.7933,.2881,1.3806,-.7046,.3928,1.478,-.6496,.3372,1.4701,-.6682,.3664,1.4343,-.6197,.4814,1.4574,-.7182,.4444,1.4811,-.6785,.4847,1.429,-.6664,.4422,1.4054,-.8116,.4734,1.4384,-.7737,.4796,1.372,-.7801,.3294,1.3939,-.8008,.3841,1.401,-.8222,.3581,1.3422,-.8038
                        ,.3112,1.4112,-.6497,.4327,1.4411,-.6261,.5027,1.4026,-.7252,.4244,1.349,-.8101,.3061,1.3543,-.7635,.3486,1.3779,-.6182,.3174,1.3449,-.6562,.3764,1.327,-.6301,.4614,1.3894,-.6291,.4067,1.3822,-.6076,.4427,1.3338,-.6365,.4919,1.3445,-.7292,.4909,1.3627,-.6728,.4606,1.3074,-.6954,.398,1.3053,-.7802,.4536,1.3132,-.7617,.4054,1.2843,-.7254
                        ,.3094,1.3259,-.7116,.3464,1.3022,-.7514,.3533,1.2964,-.6851,.4098,1.2954,-.6674,.2498,1.6552,-.3838,.199,1.6432,-.3558,.2542,1.6663,-.3258,.1677,1.606,-.322,.1687,1.5879,-.3783,.3063,1.6542,-.3661,.2832,1.6236,-.421,.2169,1.6168,-.4147,.157,1.548,-.3259,.2616,1.6453,-.271,.206,1.6374,-.2895,.2352,1.6016,-.241,.3502,1.6247,-.3395
                        ,.3132,1.6484,-.2998,.3535,1.5963,-.2877,.311,1.5727,-.433,.3422,1.6057,-.395,.3484,1.5394,-.4015,.1982,1.5612,-.4221,.2529,1.5684,-.4436,.2269,1.5095,-.4251,.18,1.5785,-.271,.3015,1.6084,-.2474,.3715,1.5699,-.3466,.2932,1.5163,-.4315,.1749,1.5216,-.3848,.2174,1.5452,-.2396,.1862,1.5122,-.2775,.2452,1.4943,-.2515,.3302,1.5567,-.2504
                        ,.2755,1.5496,-.2289,.3115,1.5011,-.2579,.3607,1.5119,-.3505,.3597,1.53,-.2942,.3294,1.4747,-.3167,.2668,1.4726,-.4016,.3224,1.4805,-.383,.2742,1.4516,-.3467,.1782,1.4932,-.333,.2152,1.4695,-.3727,.2221,1.4637,-.3064,.2786,1.4627,-.2887,-1.3402,2.2541,-.7158,-.9122,2.1956,-.7519,-1.1898,2.2964,-.576,-1.2232,1.8477,-.8111,-.9122,2.1956,-.7519
                        ,-1.1508,2.1286,-.9738,-1.2232,1.8477,-.8111,-1.2354,2.1193,-.4734,-.9846,1.9147,-.5892,-1.3859,2.077,-.6132,-1.1898,2.2964,-.576,-1.2354,2.1193,-.4734,-.9122,2.1956,-.7519,-1.1898,2.2964,-.576,-1.2232,1.8477,-.8111,-1.1508,2.1286,-.9738,-.865,1.8855,-.6637,-1.0483,1.7111,-.9972,-1.2279,2.1164,-.7121,-.3431,1.9459,-.997,-.9144,1.6885,-.4432,-.9927,1.1667,-.5713
                        ,-1.0571,1.4322,-.7236,-.185,2.0719,-.5899,-.452,1.773,-.1305,-.5909,1.9581,-.3383,-.0469,1.9198,-1.001,.0708,1.9339,-.4301,-.8214,1.491,-.2062,-.8653,1.1427,-.5563,-.2168,1.7803,-.2263,.2372,1.7617,-.9066,.019,1.7933,-.4687,-.6738,1.4368,-.2253,-.9236,1.7038,-.5351,-1.0295,1.4803,-.7503,-.2653,1.9883,-.6841,-.622,1.8576,-.5012,-.7407,1.8581,-1.2161
                        ,-1.0483,1.7111,-.9972,.0249,1.3957,-1.1534,.0782,1.4324,-1.2939,-.9088,1.3148,-1.0869,-.4419,1.0885,-1.3095,-.1786,1.6376,-1.3379,-.5821,1.3597,-1.3689,-.8143,1.0116,-1.0318,-.2079,1.1771,-1.2653,-.616,1.4511,-1.2013,-.9192,1.4021,-1.0548,-.6674,1.0025,-.9734,-.2607,1.6771,-1.2201,-.1629,1.9013,-.9913,-1.0295,1.4803,-.7503,-.622,1.8576,-.5012,-1.0483,1.7111,-.9972
                        ,-1.0295,1.4803,-.7503,-.9192,1.4021,-1.0548,-.2607,1.6771,-1.2201,-1.1508,2.1286,-.9738,-.9122,2.1956,-.7519,-1.2232,1.8477,-.8111,-1.3859,2.077,-.6132,-1.3402,2.2541,-.7158,-1.1898,2.2964,-.576,-.9122,2.1956,-.7519,-1.3859,2.077,-.6132,-1.2232,1.8477,-.8111,.2032,1.6661,-.851,-.622,1.8576,-.5012,-.9236,1.7038,-.5351,-.9236,1.7038,-.5351,-1.0295,1.4803,-.7503
                        ,-.1629,1.9013,-.9913,-.2653,1.9883,-.6841,-.2653,1.9883,-.6841,-.622,1.8576,-.5012,-.9192,1.4021,-1.0548,-.616,1.4511,-1.2013,-1.0483,1.7111,-.9972,-.9192,1.4021,-1.0548,-.616,1.4511,-1.2013,-.2607,1.6771,-1.2201,-.2607,1.6771,-1.2201,-.1629,1.9013,-.9913
                    ]),
                    false);

                var _i;//indices & affected indices for shapekeys
                _i = new Uint32Array(2334);
                _i.set([0,1,2,3,1,4,0,2,5,0,5,6,0,6,7,3,4]);
                CONTIG(_i, 17, 8, 20);
                _i.set([3,8,21,9,11,22,12,14,23,15,17,24,18,20], 30);
                CONTIG(_i, 44, 25, 40);
                _i.set([40,37,41,40,39,37,39,35,37,37,34,41,37,36,34,36,32,34,34,31,41,34,33,31,33,29,31,31,28,41,31,30,28,30,26,28,28,40,41,28,27,40,27,38,40,25,39,38,25,20
                    ,39,20,35,39,24,36,35,24,17,36,17,32,36,23,33,32,23,14,33,14,29,33,22,30,29,22,11,30,11,26,30,21,27,26,21,8,27,8,38,27,20,24,35,20,19,24,19,15,24,17
                    ,23,32,17,16,23,16,12,23,14,22,29,14,13,22,13,9,22,11,21,26,11,10,21,10,3,21,8,25,38,8,4,25,4,18,25,7,19,18,7,6,19,6,15,19,6,16,15,6,5,16
                    ,5,12,16,5,13,12,5,2,13,2,9,13,4,7,18,4,1,7,1,0,7,2,10,9,2,1,10,1,3,10,42,43,44,45,43,46,42,44,47,42,47,48,42,48,49,45,46], 60);
                CONTIG(_i, 257, 50, 62);
                _i.set([45,50,63,51,53,64,54,56,65,57,59,66,60,62], 270);
                CONTIG(_i, 284, 67, 82);
                _i.set([82,79,83,82,81,79,81,77,79,79,76,83,79,78,76,78,74,76,76,73,83,76,75,73,75,71,73,73,70,83,73,72,70,72,68,70,70,82,83,70,69,82,69,80,82,67,81,80,67,62
                    ,81,62,77,81,66,78,77,66,59,78,59,74,78,65,75,74,65,56,75,56,71,75,64,72,71,64,53,72,53,68,72,63,69,68,63,50,69,50,80,69,62,66,77,62,61,66,61,57,66,59
                    ,65,74,59,58,65,58,54,65,56,64,71,56,55,64,55,51,64,53,63,68,53,52,63,52,45,63,50,67,80,50,46,67,46,60,67,49,61,60,49,48,61,48,57,61,48,58,57,48,47,58
                    ,47,54,58,47,55,54,47,44,55,44,51,55,46,49,60,46,43,49,43,42,49,44,52,51,44,43,52,43,45,52,84,85,86,87,85,88,84,86,89,84,89,90,84,90,91,87,88], 300);
                CONTIG(_i, 497, 92, 104);
                _i.set([87,92,105,93,95,106,96,98,107,99,101,108,102,104], 510);
                CONTIG(_i, 524, 109, 124);
                _i.set([124,121,125,124,123,121,123,119,121,121,118,125,121,120,118,120,116,118,118,115,125,118,117,115,117,113,115,115,112,125,115,114,112,114,110,112,112,124,125,112,111,124,111,122,124,109,123,122,109,104
                    ,123,104,119,123,108,120,119,108,101,120,101,116,120,107,117,116,107,98,117,98,113,117,106,114,113,106,95,114,95,110,114,105,111,110,105,92,111,92,122,111,104,108,119,104,103,108,103,99,108,101
                    ,107,116,101,100,107,100,96,107,98,106,113,98,97,106,97,93,106,95,105,110,95,94,105,94,87,105,92,109,122,92,88,109,88,102,109,91,103,102,91,90,103,90,99,103,90,100,99,90,89,100
                    ,89,96,100,89,97,96,89,86,97,86,93,97,88,91,102,88,85,91,85,84,91,86,94,93,86,85,94,85,87,94,126,127,128,128,127,129,129,127,130,130,127,131,131,127,132,132,127,133,133,127
                    ,134,134,127,135,135,127,136,136,127,137,137,127,138,138,127,139,139,127,140,140,127,141,141,127,142,142,127,143,143,127,144,144,127,145,145,127,146,146,127,147,147,127,148,148,127,149,149,127,150,150
                    ,127,151,151,127,152,152,127,153,153,127,154,154,127,155,155,127,156,156,127,157,157,127,158,158,127,126,134,142,150,159,160,161,162,160,163,159,161,164,159,164,165,159,165,166,162,163], 540);
                CONTIG(_i, 836, 167, 179);
                _i.set([162,167,180,168,170,181,171,173,182,174,176,183,177,179], 849);
                CONTIG(_i, 863, 184, 199);
                _i.set([199,196,200,199,198,196,198,194,196,196,193,200,196,195,193,195,191,193,193,190,200,193,192,190,192,188,190,190,187,200,190,189,187,189,185,187,187,199,200,187,186,199,186,197,199,184,198,197,184,179
                    ,198,179,194,198,183,195,194,183,176,195,176,191,195,182,192,191,182,173,192,173,188,192,181,189,188,181,170,189,170,185,189,180,186,185,180,167,186,167,197,186,179,183,194,179,178,183,178,174,183,176
                    ,182,191,176,175,182,175,171,182,173,181,188,173,172,181,172,168,181,170,180,185,170,169,180,169,162,180,167,184,197,167,163,184,163,177,184,166,178,177,166,165,178,165,174,178,165,175,174,165,164,175
                    ,164,171,175,164,172,171,164,161,172,161,168,172,163,166,177,163,160,166,160,159,166,161,169,168,161,160,169,160,162,169,201,202,203,204,202,205,201,203,206,201,206,207,201,207,208,204,205], 879);
                CONTIG(_i, 1076, 209, 221);
                _i.set([204,209,222,210,212,223,213,215,224,216,218,225,219,221], 1089);
                CONTIG(_i, 1103, 226, 241);
                _i.set([241,238,242,241,240,238,240,236,238,238,235,242,238,237,235,237,233,235,235,232,242,235,234,232,234,230,232,232,229,242,232,231,229,231,227,229,229,241,242,229,228,241,228,239,241,226,240,239,226,221
                    ,240,221,236,240,225,237,236,225,218,237,218,233,237,224,234,233,224,215,234,215,230,234,223,231,230,223,212,231,212,227,231,222,228,227,222,209,228,209,239,228,221,225,236,221,220,225,220,216,225,218
                    ,224,233,218,217,224,217,213,224,215,223,230,215,214,223,214,210,223,212,222,227,212,211,222,211,204,222,209,226,239,209,205,226,205,219,226,208,220,219,208,207,220,207,216,220,207,217,216,207,206,217
                    ,206,213,217,206,214,213,206,203,214,203,210,214,205,208,219,205,202,208,202,201,208,203,211,210,203,202,211,202,204,211,243,244,245,246,244,247,243,245,248,243,248,249,243,249,250,246,247], 1119);
                CONTIG(_i, 1316, 251, 263);
                _i.set([246,251,264,252,254,265,255,257,266,258,260,267,261,263], 1329);
                CONTIG(_i, 1343, 268, 283);
                _i.set([283,280,284,283,282,280,282,278,280,280,277,284,280,279,277,279,275,277,277,274,284,277,276,274,276,272,274,274,271,284,274,273,271,273,269,271,271,283,284,271,270,283,270,281,283,268,282,281,268,263
                    ,282,263,278,282,267,279,278,267,260,279,260,275,279,266,276,275,266,257,276,257,272,276,265,273,272,265,254,273,254,269,273,264,270,269,264,251,270,251,281,270,263,267,278,263,262,267,262,258,267,260
                    ,266,275,260,259,266,259,255,266,257,265,272,257,256,265,256,252,265,254,264,269,254,253,264,253,246,264,251,268,281,251,247,268,247,261,268,250,262,261,250,249,262,249,258,262,249,259,258,249,248,259
                    ,248,255,259,248,256,255,248,245,256,245,252,256,247,250,261,247,244,250,244,243,250,245,253,252,245,244,253,244,246,253,285,286,287,288,286,289,285,287,290,285,290,291,285,291,292,288,289], 1359);
                CONTIG(_i, 1556, 293, 305);
                _i.set([288,293,306,294,296,307,297,299,308,300,302,309,303,305], 1569);
                CONTIG(_i, 1583, 310, 325);
                _i.set([325,322,326,325,324,322,324,320,322,322,319,326,322,321,319,321,317,319,319,316,326,319,318,316,318,314,316,316,313,326,316,315,313,315,311,313,313,325,326,313,312,325,312,323,325,310,324,323,310,305
                    ,324,305,320,324,309,321,320,309,302,321,302,317,321,308,318,317,308,299,318,299,314,318,307,315,314,307,296,315,296,311,315,306,312,311,306,293,312,293,323,312,305,309,320,305,304,309,304,300,309,302
                    ,308,317,302,301,308,301,297,308,299,307,314,299,298,307,298,294,307,296,306,311,296,295,306,295,288,306,293,310,323,293,289,310,289,303,310,292,304,303,292,291,304,291,300,304,291,301,300,291,290,301
                    ,290,297,301,290,298,297,290,287,298,287,294,298,289,292,303,289,286,292,286,285,292,287,295,294,287,286,295,286,288,295,327,328,329,330,328,331,327,329,332,327,332,333,327,333,334,330,331], 1599);
                CONTIG(_i, 1796, 335, 347);
                _i.set([330,335,348,336,338,349,339,341,350,342,344,351,345,347], 1809);
                CONTIG(_i, 1823, 352, 367);
                _i.set([367,364,368,367,366,364,366,362,364,364,361,368,364,363,361,363,359,361,361,358,368,361,360,358,360,356,358,358,355,368,358,357,355,357,353,355,355,367,368,355,354,367,354,365,367,352,366,365,352,347
                    ,366,347,362,366,351,363,362,351,344,363,344,359,363,350,360,359,350,341,360,341,356,360,349,357,356,349,338,357,338,353,357,348,354,353,348,335,354,335,365,354,347,351,362,347,346,351,346,342,351,344
                    ,350,359,344,343,350,343,339,350,341,349,356,341,340,349,340,336,349,338,348,353,338,337,348,337,330,348,335,352,365,335,331,352,331,345,352,334,346,345,334,333,346,333,342,346,333,343,342,333,332,343
                    ,332,339,343,332,340,339,332,329,340,329,336,340,331,334,345,331,328,334,328,327,334,329,337,336,329,328,337,328,330,337], 1839);
                CONTIG(_i, 2019, 369, 381);
                _i.set([376,382,369,383,384,385,386,387,388,385,387,389,390,391,392,393,394,395,396,392,394,397,389,397,398,390,396,399,393,400,401,396,393,402,397,403,391,404,405,394,406,405,395,392,406,389,403,407,388,387
                    ,407,387,408,409,400,410,390,411,391,412,413,414,410,395,413,415,414,411,398,415,390,416,410,412,411,417,418,419,412,415,391,418,404,420,395,421,414,420,417,422,386,385,423,385,388,424,425,426,427,388
                    ,407,158,126,128,128,129,130,130,131,134,131,132,134,132,133,134,134,135,136,136,137,138,138,139,142,139,140,142,140,141,142,142,143,146,143,144,146,144,145,146,146,147,148,148,149,150,150,151,152,152
                    ,153,154,154,155,156,156,157,154,157,158,154,158,128,134,128,130,134,134,136,138,146,148,150,150,152,158,152,154,158,134,138,142,142,146,150,158,134,150,369,428,370,372,377,429,430,431,376,378,432,433
                    ,434,377,376,369,435,436,389,397,390,392,396,393,395,400,396,394,393,397,397,402,398,396,401,399,400,437,401,393,399,402,403,389,391,405,392,394,405,421,395,406,394,389,409,437,400,390,415,411,412,410
                    ,413,410,400,395,415,412,414,398,419,415,416,409,410,411,414,417,419,416,412,391,411,418,420,413,395,414,413,420,438,439,385,440,441,385,442,443,388,444,445,388,446,447,407,407,448,449,407,450,451,452
                    ,453,388], 2032);
                this.setIndices(_i);

                this.setVerticesData(_B.VertexBuffer.NormalKind, new Float32Array([
                        0,-1,0,.4253,-.8506,-.309,-.1625,-.8506,-.5,.7236,-.4472,-.5257,.8506,-.5257,0,-.5257,-.8506,0,-.1625,-.8506,.5,.4253,-.8506,.309,.951,0,-.309,-.2764,-.4472,-.8506,.2629,-.5257,-.809,0,0,-1,-.8944,-.4472,0,-.6882,-.5257,-.5,-.951,0,-.309,-.2764,-.4472,.8506,-.6882,-.5257,.5
                        ,-.5878,0,.809,.7236,-.4472,.5257,.2629,-.5257,.809,.5878,0,.809,.5878,0,-.809,-.5878,0,-.809,-.951,0,.309,0,0,1,.951,0,.309,.2764,.4472,-.8506,.6882,.5257,-.5,.1625,.8506,-.5,-.7236,.4472,-.5257,-.2629,.5257,-.809,-.4253,.8506,-.309,-.7236,.4472,.5257,-.8506,.5257,0
                        ,-.4253,.8506,.309,.2764,.4472,.8506,-.2629,.5257,.809,.1625,.8506,.5,.8944,.4472,0,.6882,.5257,.5,.5257,.8506,0,0,1,0,0,-1,0,.4253,-.8506,-.309,-.1625,-.8506,-.5,.7236,-.4472,-.5257,.8506,-.5257,0,-.5257,-.8506,0,-.1625,-.8506,.5,.4253,-.8506,.309,.951,0,-.309
                        ,-.2764,-.4472,-.8506,.2629,-.5257,-.809,0,0,-1,-.8944,-.4472,0,-.6882,-.5257,-.5,-.951,0,-.309,-.2764,-.4472,.8506,-.6882,-.5257,.5,-.5878,0,.809,.7236,-.4472,.5257,.2629,-.5257,.809,.5878,0,.809,.5878,0,-.809,-.5878,0,-.809,-.951,0,.309,0,0,1,.951,0,.309
                        ,.2764,.4472,-.8506,.6882,.5257,-.5,.1625,.8506,-.5,-.7236,.4472,-.5257,-.2629,.5257,-.809,-.4253,.8506,-.309,-.7236,.4472,.5257,-.8506,.5257,0,-.4253,.8506,.309,.2764,.4472,.8506,-.2629,.5257,.809,.1625,.8506,.5,.8944,.4472,0,.6882,.5257,.5,.5257,.8506,0,0,1,0,.1332,-.8886,.4388
                        ,.6019,-.7779,.1805,.0922,-.991,-.0964,.8908,-.4347,-.1317,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318,.2678,-.394,-.8792,-.7939,-.6073,.0303,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022
                        ,.6092,-.0204,.7927,.1041,-.0867,.9908,.3442,.4567,.8203,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426,.1756,.597,-.7827,-.6092,.0204,-.7927,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805
                        ,-.0237,.7974,.6029,-.5376,.7243,.4318,-.0922,.991,.0964,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,-.8036,.1617,.5727,.9525,.2456,.18,-.7785,.0204,.6272,-.7463,-.1274,.6533,-.7081,-.2763,.6498,-.6655,-.4203,.6167,-.6201,-.554,.5555,-.5736,-.672,.4683,-.5279,-.7699,.3585,-.4848,-.8437,.2304
                        ,-.4458,-.8907,.089,-.4126,-.9089,-.0602,-.3864,-.8977,-.2116,-.3682,-.8576,-.359,-.3588,-.7902,-.4969,-.3584,-.698,-.6199,-.3671,-.5848,-.7233,-.3845,-.4549,-.8032,-.4099,-.3135,-.8566,-.4423,-.1658,-.8814,-.4805,-.0176,-.8768,-.523,.1254,-.843,-.5682,.2579,-.7814,-.6143,.3747,-.6944,-.6597,.4715,-.5852,-.7025,.5446,-.4581,-.7411,.5913,-.3179
                        ,-.7742,.6098,-.1698,-.8003,.5992,-.0196,-.8186,.5601,.127,-.8283,.4939,.2646,-.829,.403,.3878,-.8207,.2908,.4918,.1332,-.8886,.4388,.6019,-.7779,.1805,.0922,-.991,-.0964,.8908,-.4347,-.1317,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318
                        ,.2678,-.394,-.8792,-.7939,-.6073,.0303,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022,.6092,-.0204,.7927,.1041,-.0867,.9908,.3442,.4567,.8203,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426
                        ,.1756,.597,-.7827,-.6092,.0204,-.7927,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805,-.0237,.7974,.6029,-.5376,.7243,.4318,-.0922,.991,.0964,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,.1332,-.8886,.4388,.6019,-.7779,.1805,.0922,-.991,-.0964
                        ,.8908,-.4347,-.1317,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318,.2678,-.394,-.8792,-.7939,-.6073,.0303,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022,.6092,-.0204,.7927,.1041,-.0867,.9908
                        ,.3442,.4567,.8203,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426,.1756,.597,-.7827,-.6092,.0204,-.7927,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805,-.0237,.7974,.6029,-.5376,.7243,.4318
                        ,-.0922,.991,.0964,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,.1332,-.8886,.4388,.6019,-.7779,.1805,.0922,-.991,-.0964,.8908,-.4347,-.1317,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318,.2678,-.394,-.8792
                        ,-.7939,-.6073,.0303,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022,.6092,-.0204,.7927,.1041,-.0867,.9908,.3442,.4567,.8203,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426,.1756,.597,-.7827
                        ,-.6092,.0204,-.7927,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805,-.0237,.7974,.6029,-.5376,.7243,.4318,-.0922,.991,.0964,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,.1332,-.8886,.4388,.6019,-.7779,.1805,.0922,-.991,-.0964,.8908,-.4347,-.1317
                        ,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318,.2678,-.394,-.8792,-.7939,-.6073,.0303,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022,.6092,-.0204,.7927,.1041,-.0867,.9908,.3442,.4567,.8203
                        ,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426,.1756,.597,-.7827,-.6092,.0204,-.7927,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805,-.0237,.7974,.6029,-.5376,.7243,.4318,-.0922,.991,.0964
                        ,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,.1332,-.8886,.4388,.6019,-.7779,.1805,.0922,-.991,-.0964,.8908,-.4347,-.1317,.8817,-.2676,.3885,-.3883,-.8793,.2757,-.1756,-.597,.7827,.4364,-.5343,.7239,.9903,.1014,-.0952,.0237,-.7974,-.6029,.5376,-.7243,-.4318,.2678,-.394,-.8792,-.7939,-.6073,.0303
                        ,-.4527,-.8257,-.3366,-.8247,-.3449,-.4481,-.432,-.1271,.8928,-.7206,-.4317,.5426,-.7776,.1808,.6022,.6092,-.0204,.7927,.1041,-.0867,.9908,.3442,.4567,.8203,.7776,-.1808,-.6022,-.3442,-.4567,-.8203,-.9903,-.1014,.0952,-.2678,.394,.8792,.8247,.3449,.4481,.432,.1271,-.8928,.7206,.4317,-.5426,.1756,.597,-.7827,-.6092,.0204,-.7927
                        ,-.1041,.0867,-.9908,-.4364,.5343,-.7239,-.8908,.4347,.1317,-.8817,.2676,-.3885,-.6019,.7779,-.1805,-.0237,.7974,.6029,-.5376,.7243,.4318,-.0922,.991,.0964,.7939,.6073,-.0303,.4527,.8257,.3366,.3883,.8793,-.2757,-.1332,.8886,-.4388,-.7062,.6701,-.2283,.8984,.4085,-.1609,.0453,.8812,.4706,-.2599,-.8872,-.3812,.8984,.4085,-.1609
                        ,.0098,.159,-.9872,-.2599,-.8872,-.3812,-.1828,-.0037,.9831,.6287,-.6377,.4451,-.9344,-.2147,.2843,.0453,.8812,.4706,-.1828,-.0037,.9831,.8984,.4085,-.1609,.0453,.8812,.4706,-.2599,-.8872,-.3812,.0098,.159,-.9872,-.3607,.601,.7132,-.9209,-.0516,-.3863,-.7602,.5331,.3713,.1296,.9183,-.374,-.7911,.4943,.3601,-.7357,-.5886,.3351
                        ,-.9977,.0565,-.0384,.0268,.9996,.0029,.0571,.2226,.9732,-.3976,.8672,.2997,.2367,.841,-.4864,.7401,.4205,.5248,-.5323,-.1354,.8357,-.208,-.8467,.4898,.4006,.2387,.8846,.9431,.2907,-.1612,.7523,-.3962,.5263,-.0177,-.4868,.8733,-.7972,.5546,.2385,-.9564,.2676,-.1168,-.3385,.8971,-.2837,-.402,.9112,-.0903,-.2062,.4467,-.8706
                        ,-.9209,-.0516,-.3863,.756,-.648,.0928,.7498,-.2419,-.6159,-.7833,-.0731,-.6173,.0712,-.7343,-.675,.0342,.4931,-.8693,-.3873,.1668,-.9067,-.5225,-.7968,-.3034,.4136,-.6468,-.6407,-.4415,.3979,-.8042,-.752,-.0138,-.659,-.0101,-.9999,-.0104,-.2104,.6759,-.7063,-.0164,.8613,-.5078,-.9564,.2676,-.1168,-.402,.9112,-.0903,-.9209,-.0516,-.3863
                        ,-.9564,.2676,-.1168,-.752,-.0138,-.659,-.2104,.6759,-.7063,.0098,.159,-.9872,.8984,.4085,-.1609,-.2599,-.8872,-.3812,-.9344,-.2147,.2843,-.7062,.6701,-.2283,.0453,.8812,.4706,.8984,.4085,-.1609,-.9344,-.2147,.2843,-.2599,-.8872,-.3812,.9558,-.2501,.1544,-.402,.9112,-.0903,-.7972,.5546,.2385,-.7972,.5546,.2385,-.9564,.2676,-.1168
                        ,-.0164,.8613,-.5078,-.3385,.8971,-.2837,-.3385,.8971,-.2837,-.402,.9112,-.0903,-.752,-.0138,-.659,-.4415,.3979,-.8042,-.9209,-.0516,-.3863,-.752,-.0138,-.659,-.4415,.3979,-.8042,-.2104,.6759,-.7063,-.2104,.6759,-.7063,-.0164,.8613,-.5078
                    ]),
                    false);

                this.setVerticesData(_B.VertexBuffer.UVKind, new Float32Array([
                        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
                        ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.8159,.2114,.9065,.2646,.8127,.2628,.9921,.073,.9134,.006,.9902,.0058
                        ,.9116,.1505,.8197,.0696,.9113,.0729,.9928,.1484,.9174,.0784,.9935,.0784,.9134,.006,.8204,.0062,.9116,.1505,.909,.2132,.4231,.6645,.4201,.5972,.4863,.6313,.439,.759,.8665,.8623,.9909,.8275,.9497,.898,.7112,.8399,.8063,.7801,.7903,.8371,.617,.8726,.7076,.7844,.8864,.7952,.991,.7989,.8191,.7487
                        ,.59,.7902,.7043,.7522,.8882,.7673,.8683,.8829,.9396,.9086,.7084,.8691,.7963,.8728,.498,.7363,.5425,.7009,.7043,.7522,.7076,.7844,.8665,.8623,.8063,.7801,.7112,.8399,.7903,.8371,.8864,.7952,.8191,.7487,.7963,.8728,.8683,.8829,.8882,.7673,.7084,.8691,.6321,.8925,.3728,.6086,.3809,.6972,.5425,.7009
                        ,.6036,.6989,.5779,.7453,.4793,.801,.909,.2132,.9134,.006,.9116,.1505,.8184,.1495,.9168,.1484,.9174,.0784,.9134,.006,.8184,.1495,.9116,.1505,.5958,.7607,.3809,.6972,.3783,.6511,.3783,.6511,.3728,.6086,.4279,.7822,.3922,.7512,.3922,.7512,.3809,.6972,.5779,.7453,.5439,.7825,.5425,.7009,.5779,.7453
                        ,.5439,.7825,.4793,.801,.4793,.801,.4279,.7822
                    ]),
                    false);

                this.setVerticesData(_B.VertexBuffer.ColorKind, new Float32Array([
                        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                        ,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
                    ]),
                    false);

                geo = (_B.Tools.Now - geo) / 1000;
                this.setMaterialByID("Snowman_Generic3.Body");
                this.subMeshes = [];
                new _B.SubMesh(0, 0, 454, 0, 2334, this);
                if (scene._selectionOctree) {
                    scene.createOrUpdateSelectionOctree();
                }
            }
            if (this.postConstruction) this.postConstruction();
            this.initComplete = true;
            load = (_B.Tools.Now - load) / 1000;
            _B.Tools.Log("defined mesh: " + this.name + (cloning ? " (cloned)" : "") + " completed:  " + load.toFixed(2) + ", geometry:  " + geo.toFixed(2) + ", skey:  " + shape.toFixed(2) + " secs");
            if (matLoaded && !_sceneTransitionName){
                if (typeof this.grandEntrance == "function") this.grandEntrance();
                else makeVisible(this);

            } else waitingMeshes.push(this);
        }

        Body.prototype.dispose = function (doNotRecurse) {
            _super.prototype.dispose.call(this, doNotRecurse);
            if (this.skeleton) this.skeleton.dispose();
        };
        return Body;
    })(BABYLON.Mesh);
    Snowman_Generic3.Body = Body;

    function child_ArmR(scene, parent, source){
        var ret = new BABYLON.Mesh(parent.name + ".ArmR", scene, parent, source);
        var cloning = source && source !== null;
        var load = _B.Tools.Now;
        var geo = 0;
        var shape = 0;
        ret.position.x  = .511;
        ret.position.y  = -.5545;
        ret.position.z  = -1.9267;
        ret.rotation.x  = -.4583;
        ret.rotation.y  = -1.361;
        ret.rotation.z  = 1.9929;
        ret.scaling.x   = 1.4009;
        ret.scaling.y   = 1.3464;
        ret.scaling.z   = 1.4006;

        ret.id = ret.name;
        ret.billboardMode  = 0;
        ret.isVisible  = false; //always false; evaluated again at bottom
        ret.setEnabled(true);
        ret.checkCollisions = false;
        ret.receiveShadows  = false;
        ret.castShadows  = false;
        ret.initComplete = false;
        if (!cloning){
            geo = _B.Tools.Now;
            ret.setVerticesData(_B.VertexBuffer.PositionKind, new Float32Array([
                    .0422,.8123,.0253,.005,1,.005,.0595,.809,.0179,.0071,1,0,.0667,.8076,0,.0595,.809,-.0179,.005,1,-.005,.0422,.8123,-.0253,.0595,.809,-.0179,0,1,-.0071,.0248,.8156,-.0179,-.005,1,-.005,.0176,.817,0,.0248,.8156,-.0179,-.0071,1,0,0,1,-.0071,.0071,1,0
                    ,-.005,1,.005,.0248,.8156,.0179,.0248,.8156,.0179,0,1,.0071,.0422,.8123,.0253,-.054,-.8435,-.05,-.0747,-.8359,-.0005,-.0542,-.8366,.049,-.0341,.567,.0219,-.0153,.6136,.0299,-.0143,.56,.031,-.088,.6701,-.003,-.1377,.6881,-.0015,-.1394,.6887,-.006,-.0833,.6669,-.0158,-.1336,.6864,-.0123,-.0726,.6591,-.0211
                    ,-.0839,.667,.0098,-.1379,.6773,-.0013,-.1377,.6881,-.0015,.0055,.6062,-.0211,-.0113,.5596,-.031,.0085,.5527,-.0219,.0123,.6034,0,.0085,.5527,-.0219,.0157,.5502,0,.0063,.553,.0219,-.0143,.56,.031,.0037,.6064,.0211,.0363,.2598,.0375,.062,.2545,.0265,.0726,.2523,0,.062,.2545,-.0265,.0363,.2598,-.0375
                    ,.062,.2545,-.0265,-.0113,.5596,-.031,.0106,.2652,-.0265,.0363,.2598,-.0375,-.0321,.5668,-.0219,0,.2674,0,-.0341,.567,.0219,.0106,.2652,.0265,.0106,.2652,.0265,.0363,.2598,.0375,-.1396,.6779,-.006,-.1377,.6881,-.0015,-.1379,.6773,-.0013,-.1376,.6881,-.0105,-.1378,.6773,-.0107,-.1336,.6864,-.0123,-.1336,.676,-.0126
                    ,-.0909,.6133,-.003,-.1376,.6881,-.0105,-.0909,.6133,-.003,-.1379,.6773,-.0013,-.0867,.6101,.0103,-.0726,.6591,-.0211,-.1336,.676,-.0126,-.0746,.6022,-.0218,-.0858,.61,-.0163,-.0336,.6207,.0211,.0422,.8123,.0253,-.0336,.6207,.0211,-.0406,.6223,0,-.032,.6195,-.0211,-.0128,.6133,-.0299,-.032,.6195,-.0211,.0595,.809,-.0179
                    ,.0055,.6062,-.0211,.0422,.8123,.0253,.0037,.6064,.0211,-.0321,.5668,-.0219,-.0746,.6022,-.0218,-.0858,.61,-.0163,-.0414,.5697,0,-.0341,.567,.0219,-.0406,.6223,0,-.032,.6195,-.0211,-.0858,.61,-.0163,-.0909,.6133,-.003,-.0867,.6101,.0103,-.032,.6195,-.0211,-.0726,.6591,-.0211,-.0128,.6133,-.0299,-.0406,.6223,0
                    ,-.0839,.667,.0098,-.0445,-.6058,.0426,-.034,-.2513,.0505,-.0022,-.6075,.0603,-.0619,-.605,0,-.0692,-.2481,.0357,-.0445,-.6058,.0426,-.0692,-.2481,-.0357,-.0445,-.6058,-.0426,-.034,-.2513,-.0505,-.0445,-.6058,-.0426,-.0022,-.6075,-.0603,.0012,-.2545,-.0357,.0401,-.6092,-.0426,.0158,-.2558,0,.0401,-.6092,-.0426,.0576,-.6099,0
                    ,.0401,-.6092,.0426,.0012,-.2545,.0357,.0401,-.6092,.0426,-.0312,.0212,.0311,-.0692,-.2481,.0357,.0363,.2598,.0375,-.0008,.0165,.044,-.0838,-.2467,0,-.0312,.0212,.0311,-.044,.0235,0,.0106,.2652,.0265,-.0312,.0212,-.0311,-.044,.0235,0,-.0312,.0212,-.0311,-.0692,-.2481,-.0357,-.0312,.0212,-.0311,-.0008,.0165,-.044
                    ,.062,.2545,-.0265,.0294,.0123,-.0311,.0294,.0123,-.0311,.0012,-.2545,-.0357,.0294,.0123,-.0311,.0421,.0104,0,.0294,.0123,.0311,.0012,-.2545,.0357,.062,.2545,.0265,.0294,.0123,.0311,-.0045,-.8443,.0695,.0401,-.6092,.0426,.0453,-.8558,.0491,.0453,-.8558,.0491,.066,-.8626,-.0004,.0455,-.8622,-.0499,-.0042,-.8543,-.0704
                    ,.0455,-.8622,-.0499,-.054,-.8435,-.05,-.0747,-.8359,-.0005,-.054,-.8435,-.05,-.0747,-.8359,-.0005,-.0445,-.6058,.0426,-.0542,-.8366,.049,-.0542,-.8366,.049,0,1,.0071,.005,1,-.005,-.005,1,-.005,-.0071,1,0,.0071,1,0,.005,1,.005,0,1,.0071,0,1,.0071,-.005,1,.005
                    ,-.005,1,-.005,0,1,-.0071,0,1,-.0071,.005,1,-.005,.0071,1,0,.0071,1,0,0,1,.0071,-.0071,1,0,.0248,.8156,.0179,-.005,1,.005,-.0045,-.8443,.0695,-.0045,-.8443,.0695,.0453,-.8558,.0491,-.0042,-.8543,-.0704,-.0045,-.8443,.0695,-.0042,-.8543,-.0704,.0453,-.8558,.0491
                    ,.066,-.8626,-.0004,.0455,-.8622,-.0499,.0455,-.8622,-.0499,-.0042,-.8543,-.0704,.0453,-.8558,.0491,-.0839,.667,.0098,-.1376,.6881,-.0105,-.0867,.6101,.0103,.0055,.6062,-.0211,.0085,.5527,-.0219,-.0143,.56,.031,-.0153,.6136,.0299,-.0143,.56,.031,.0085,.5527,-.0219,-.0113,.5596,-.031,-.0414,.5697,0,-.0414,.5697,0
                    ,-.0341,.567,.0219,.0106,.2652,.0265,-.1394,.6887,-.006,-.1377,.6881,-.0015,-.1394,.6887,-.006,-.1336,.6864,-.0123,-.1376,.6881,-.0105,-.0909,.6133,-.003,-.1396,.6779,-.006,-.1379,.6773,-.0013,-.0726,.6591,-.0211,-.1336,.6864,-.0123,-.1336,.676,-.0126,-.0746,.6022,-.0218,.0248,.8156,.0179,.0422,.8123,.0253,-.0336,.6207,.0211
                    ,.0248,.8156,-.0179,.0595,.809,-.0179,.0055,.6062,-.0211,.0422,.8123,.0253,.0595,.809,.0179,.0037,.6064,.0211,-.0321,.5668,-.0219,-.0113,.5596,-.031,-.0746,.6022,-.0218,-.0726,.6591,-.0211,-.0909,.6133,-.003,-.0406,.6223,0,-.0321,.5668,-.0219,-.0858,.61,-.0163,-.0867,.6101,.0103,-.032,.6195,-.0211,-.0833,.6669,-.0158
                    ,-.0726,.6591,-.0211,-.0406,.6223,0,-.0336,.6207,.0211,-.0839,.667,.0098,-.0692,-.2481,.0357,-.0692,-.2481,-.0357,-.0445,-.6058,-.0426,.0012,-.2545,-.0357,.0401,-.6092,-.0426,.0012,-.2545,.0357,.0106,.2652,.0265,.0363,.2598,.0375,-.044,.0235,0,-.0312,.0212,.0311,0,.2674,0,.0106,.2652,.0265,-.044,.0235,0
                    ,-.044,.0235,0,-.0312,.0212,-.0311,.0106,.2652,-.0265,-.0312,.0212,-.0311,.062,.2545,-.0265,.0294,.0123,-.0311,.0294,.0123,-.0311,.0294,.0123,.0311,.0363,.2598,.0375,.062,.2545,.0265,.0401,-.6092,.0426,.0453,-.8558,.0491,.0401,-.6092,-.0426,-.0445,-.6058,-.0426,-.054,-.8435,-.05,-.0747,-.8359,-.0005,-.0747,-.8359,-.0005
                    ,-.0445,-.6058,.0426,-.0542,-.8366,.049
                ]),
                false);

            var _i;//indices & affected indices for shapekeys
            _i = new Uint32Array(516);
            _i.set([0,1,2,2,3,4,3,5,4,6,7,8,9,10,7,11,12,13,14,15,16,12]);
            CONTIG(_i, 22, 17, 43);
            _i.set([40,42,44,45,43,46,43,47,47,42,48,42,49,48,39,50,51,52,53,54,55,56,53,56,57,58,59,27,60,61,62,63,64,61,65,66,65,67,68,65,61,28,69,31,70,71,72,73,74,75
                ,76,67,65,77,78,26,12,79,80,81,12,80,82,10,83,84,82,37,4,85,40,2,40,45,86,87,26,88,89,90,82,75,38,91,72,92,93,31,94,91,95,96,77,97,34,98,99,100,101,102
                ,28,103,104,105,106,107,108,109,106,110,111,112,113,114,113,115,116,117,118,119,116,118,105,120,121,122,104,123,122,124,125,126,127,107,128,129,122,130,126,109,53,131,130,111,132,133,50,134,135,114
                ,135,111,136,135,137,116,138,139,48,140,141,142,116,143,142,48,141,125,120,104,125,144,145,146,147,148,149,118,150,118,151,150,115,152,153,113,154,152,110,155,156,157,158,159,160,105,146,0,161,1
                ,2,1,3,3,162,5,6,9,7,9,163,10,11,164,12,165,166,167,168,169,14,14,170,171,172,173,174,175,176,14,12,177,17,178,179,20,24,180,22,181,182,183,22,184,185,186,187,188,189,190
                ,191,25,77,26,28,192,29,31,193,32,34,194,35,37,82,38,40,195,196,43,45,40,197,198,45,46,199,43,47,43,42,42,200,49,39,38,50,201,55,53,55,202,56,56,203,204,205,25,27,61
                ,206,207,64,208,61,209,64,65,68,76,65,28,30,210,211,212,213,214,215,216,76,217,67,77,218,219,12,18,220,81,221,12,82,7,10,222,7,82,4,5,223,2,4,40,224,225,226,227,228,229
                ,82,230,75,91,231,72,232,28,31,91,233,234,77,25,235,236,237,238,239,240,241,103,242,104,106,126,107,109,126,106,111,243,244,114,111,113,116,245,246,119,247,116,105,104,120,122,125,104,122,248
                ,249,126,250,251,128,252,253,130,254,126,53,56,255,111,135,256,50,257,258,114,137,135,259,50,135,116,141,260,48,49,261,142,141,116,142,47,48,125,262,120,125,263,264,146,105,265,266,119,118,118
                ,267,151,115,113,152,113,268,269,110,106,270,271,106,272,273,103,105], 49);
            ret.setIndices(_i);

            ret.setVerticesData(_B.VertexBuffer.NormalKind, new Float32Array([
                    .0722,.0669,.9951,.4729,.7181,.5105,.7428,.0295,.6688,.6724,.7401,0,.9999,.0089,.0013,.7431,.0327,-.6683,.4729,.7181,-.5105,.0709,.0682,-.9951,.7431,.0327,-.6683,-.0417,.661,-.7492,-.6746,.0745,-.7344,-.5859,.6027,-.5417,-.9973,.0735,-.0013,-.6746,.0745,-.7344,-.8152,.5792,0,-.0417,.661,-.7492,.6724,.7401,0
                    ,-.5859,.6027,.5417,-.6735,.0772,.7351,-.6735,.0772,.7351,-.0417,.661,.7492,.0722,.0669,.9951,-.628,-.5721,-.5275,-.8517,-.5235,.0231,-.619,-.5362,.5739,-.6539,-.182,.7343,-.0392,.0195,.999,-.0221,.0133,.9997,.4946,.869,.0135,-.378,.6907,.6165,-.6351,.7724,-.0055,.4814,.8384,-.2554,.0203,.669,-.7429,.4629,.6527,-.5997
                    ,.3315,.6391,.6939,-.7027,-.2266,.6745,-.378,.6907,.6165,.7243,-.064,-.6865,.0289,-.0209,-.9994,.7464,.0983,-.6581,.995,-.0912,.0408,.7464,.0983,-.6581,.9905,.1307,.0429,.7121,.0961,.6954,-.0221,.0133,.9997,.6935,-.0647,.7176,.0459,.0337,.9984,.735,.0303,.6774,.9997,.0229,0,.7352,.0297,-.6771,.0449,.0333,-.9984
                    ,.7352,.0297,-.6771,.0289,-.0209,-.9994,-.6941,.0213,-.7195,.0449,.0333,-.9984,-.6745,-.4415,-.5916,-.9999,.0128,-.0011,-.6539,-.182,.7343,-.6942,.0185,.7196,-.6942,.0185,.7196,.0459,.0337,.9984,-.9643,-.2644,-.0116,-.378,.6907,.6165,-.7027,-.2266,.6745,-.4072,.7178,-.5647,-.7552,-.2496,-.606,.0203,.669,-.7429,-.3386,-.1102,-.9344
                    ,-.7514,-.6595,-.0209,-.4072,.7178,-.5647,-.7514,-.6595,-.0209,-.7027,-.2266,.6745,-.6044,-.4617,.6493,.4629,.6527,-.5997,-.3386,-.1102,-.9344,-.4812,-.4506,-.7519,-.6963,-.6063,-.384,-.3891,.2558,.8849,.0722,.0669,.9951,-.3891,.2558,.8849,-.0595,.9977,-.0304,.0324,.9994,-.0107,.09,.0564,-.9943,.0324,.9994,-.0107,.7431,.0327,-.6683
                    ,.7243,-.064,-.6865,.0722,.0669,.9951,.6935,-.0647,.7176,-.6745,-.4415,-.5916,-.4812,-.4506,-.7519,-.6963,-.6063,-.384,-.8403,-.5412,-.0292,-.6539,-.182,.7343,-.0595,.9977,-.0304,.0324,.9994,-.0107,-.6963,-.6063,-.384,-.7514,-.6595,-.0209,-.6044,-.4617,.6493,.0324,.9994,-.0107,.4629,.6527,-.5997,.09,.0564,-.9943,-.0595,.9977,-.0304
                    ,.3315,.6391,.6939,-.7029,.0076,.7112,-.0241,.0243,.9994,.0132,.0353,.9993,-1,-.0035,.0002,-.7211,.0377,.6918,-.7029,.0076,.7112,-.7211,.0377,-.6918,-.703,.0086,-.7111,-.0241,.0243,-.9994,-.703,.0086,-.7111,.0132,.0366,-.9992,.6981,.0149,-.7158,.7142,.0636,-.697,.9999,.0121,0,.7142,.0636,-.697,.9973,.0739,.0002
                    ,.714,.0625,.6973,.6981,.0149,.7158,.714,.0625,.6973,-.6984,.1213,.7053,-.7211,.0377,.6918,.0459,.0337,.9984,.0014,.0253,.9997,-.999,.0442,0,-.6984,.1213,.7053,-.9869,.1611,0,-.6942,.0185,.7196,-.6984,.1213,-.7053,-.9869,.1611,0,-.6984,.1213,-.7053,-.7211,.0377,-.6918,-.6984,.1213,-.7053,.0014,.0253,-.9997
                    ,.7352,.0297,-.6771,.7051,-.0718,-.7054,.7051,-.0718,-.7054,.6981,.0149,-.7158,.7051,-.0718,-.7054,.9937,-.1116,0,.7051,-.0718,.7054,.6981,.0149,.7158,.735,.0303,.6774,.7051,-.0718,.7054,-.0797,-.5786,.8117,.714,.0625,.6973,.4739,-.6475,.5967,.4739,-.6475,.5967,.7287,-.6841,.0316,.4849,-.6848,-.5439,-.0846,-.6353,-.7676
                    ,.4849,-.6848,-.5439,-.628,-.5721,-.5275,-.8517,-.5235,.0231,-.628,-.5721,-.5275,-.8517,-.5235,.0231,-.7029,.0076,.7112,-.619,-.5362,.5739,-.619,-.5362,.5739,-.0417,.661,.7492,.4729,.7181,-.5105,-.5859,.6027,-.5417,-.8152,.5792,0,.6724,.7401,0,.4729,.7181,.5105,-.0417,.661,.7492,-.0417,.661,.7492,-.5859,.6027,.5417
                    ,-.5859,.6027,-.5417,-.0417,.661,-.7492,-.0417,.661,-.7492,.4729,.7181,-.5105,.6724,.7401,0,.6724,.7401,0,-.0417,.661,.7492,-.8152,.5792,0,-.6735,.0772,.7351,-.5859,.6027,.5417,-.0797,-.5786,.8117,-.0797,-.5786,.8117,.4739,-.6475,.5967,-.0846,-.6353,-.7676,-.0797,-.5786,.8117,-.0846,-.6353,-.7676,.4739,-.6475,.5967
                    ,.7287,-.6841,.0316,.4849,-.6848,-.5439,.4849,-.6848,-.5439,-.0846,-.6353,-.7676,.4739,-.6475,.5967,.3315,.6391,.6939,-.4072,.7178,-.5647,-.6044,-.4617,.6493,.7243,-.064,-.6865,.7464,.0983,-.6581,-.0221,.0133,.9997,-.0392,.0195,.999,-.0221,.0133,.9997,.7464,.0983,-.6581,.0289,-.0209,-.9994,-.8403,-.5412,-.0292,-.8403,-.5412,-.0292
                    ,-.6539,-.182,.7343,-.6942,.0185,.7196,-.6351,.7724,-.0055,-.378,.6907,.6165,-.6351,.7724,-.0055,.0203,.669,-.7429,-.4072,.7178,-.5647,-.7514,-.6595,-.0209,-.9643,-.2644,-.0116,-.7027,-.2266,.6745,.4629,.6527,-.5997,.0203,.669,-.7429,-.3386,-.1102,-.9344,-.4812,-.4506,-.7519,-.6735,.0772,.7351,.0722,.0669,.9951,-.3891,.2558,.8849
                    ,-.6746,.0745,-.7344,.7431,.0327,-.6683,.7243,-.064,-.6865,.0722,.0669,.9951,.7428,.0295,.6688,.6935,-.0647,.7176,-.6745,-.4415,-.5916,.0289,-.0209,-.9994,-.4812,-.4506,-.7519,.4629,.6527,-.5997,-.7514,-.6595,-.0209,-.0595,.9977,-.0304,-.6745,-.4415,-.5916,-.6963,-.6063,-.384,-.6044,-.4617,.6493,.0324,.9994,-.0107,.4814,.8384,-.2554
                    ,.4629,.6527,-.5997,-.0595,.9977,-.0304,-.3891,.2558,.8849,.3315,.6391,.6939,-.7211,.0377,.6918,-.7211,.0377,-.6918,-.703,.0086,-.7111,.6981,.0149,-.7158,.7142,.0636,-.697,.6981,.0149,.7158,-.6942,.0185,.7196,.0459,.0337,.9984,-.9869,.1611,0,-.6984,.1213,.7053,-.9999,.0128,-.0011,-.6942,.0185,.7196,-.9869,.1611,0
                    ,-.9869,.1611,0,-.6984,.1213,-.7053,-.6941,.0213,-.7195,-.6984,.1213,-.7053,.7352,.0297,-.6771,.7051,-.0718,-.7054,.7051,-.0718,-.7054,.7051,-.0718,.7054,.0459,.0337,.9984,.735,.0303,.6774,.714,.0625,.6973,.4739,-.6475,.5967,.7142,.0636,-.697,-.703,.0086,-.7111,-.628,-.5721,-.5275,-.8517,-.5235,.0231,-.8517,-.5235,.0231
                    ,-.7029,.0076,.7112,-.619,-.5362,.5739
                ]),
                false);

            ret.setVerticesData(_B.VertexBuffer.UVKind, new Float32Array([
                    .6015,.1012,.612,.0001,.6209,.1032,.6199,.0001,.6488,.1041,.669,.1033,.4699,.9997,.5104,.8986,.5378,.8968,.462,.9997,.4906,.9005,.864,0,.8403,.0973,.8122,.0974,.8958,.1227,.8904,.1276,.8775,.1254,.8775,.0003,.8602,.0983,.2317,.0991,.195,0,.259,.101,1,.2548,.945,.2756,.8672,.2755
                    ,.1509,.2326,.1813,.2077,.1824,.2365,.8432,.3049,.8378,.2767,.8442,.2756,.8622,.3076,.8537,.2788,.8706,.3142,.0786,.1788,0,.1731,.0003,.1673,.4632,.7882,.4352,.7632,.4669,.7595,.6148,.2129,.6412,.2401,.6156,.2415,.581,.2398,.5576,.2358,.5817,.2111,.5707,.3974,.5995,.4007,.6409,.4021,.6708,.4008
                    ,.4973,.6021,.5378,.5992,.768,.7531,.7831,.5958,.8122,.5935,.7441,.7564,.7415,.5966,.6841,.7564,.7119,.5956,.2093,.3944,.2498,.3975,.8846,.3201,.8853,.3259,.8794,.3205,.8965,.3242,.8911,.3188,.9001,.3229,.895,.3176,.8737,.2855,.8508,.2765,.925,.0504,.9317,.0836,.905,.0489,.3569,.8169,.2783,.8263
                    ,.354,.7864,.8913,.2812,.1519,.2037,.259,.101,.8775,.2045,.8532,.2033,.8199,.204,.4337,.792,.4121,.7955,.5378,.8968,.6396,.2114,.259,.101,.2019,.2113,.94,.0123,.9485,.039,.943,.0463,.9106,.0192,.8775,.0168,.8424,.337,.8737,.3414,.943,.0463,.925,.0504,.0743,.2093,.8775,.1131,.891,.0904
                    ,.891,.1205,.8424,.337,.8249,.3079,.1312,.8619,.1547,.6719,.1977,.8631,.7336,.1275,.6708,.3186,.6861,.1274,.7667,.3188,.8005,.1276,.3961,.328,.3866,.138,.435,.1367,.4515,.3264,.5016,.1359,.5995,.6739,.6631,.8638,.6154,.8644,.5485,.8636,.1941,.6733,.2451,.8636,.1519,.5254,.0993,.6699,.2498,.3975
                    ,.1998,.5281,.7106,.3191,.6899,.4638,.1178,.5237,.2093,.3944,.7735,.464,.7245,.4649,.4093,.4744,.3558,.3301,.4093,.4744,.444,.4716,.5378,.5992,.4916,.4694,.6542,.5303,.6396,.673,.6542,.5303,.6193,.5314,.5705,.5302,.5435,.6729,.2783,.4001,.2334,.5301,.1962,.9902,.2451,.8636,.2521,.996,.5378,.996
                    ,.6155,1,.6708,.9997,.4276,.0042,.5057,0,.3703,.0105,.7341,.0035,.8122,0,.7341,.0035,.6861,.1274,.6791,.0034,.1182,.9858,.6065,0,.6255,.0001,.4563,.9997,.8719,.0002,.8775,.1254,.8775,.1225,.8829,.1205,.8829,.1205,.8904,.1206,.8958,.1256,.8904,.1276,.8904,.1276,.8829,.1275,.8775,.1254
                    ,.8775,.1254,.8829,.1205,.8719,.0002,.2317,.0991,.1871,0,.8123,.2547,.8123,.2547,.8122,.2252,1,.2254,.8123,.2547,1,.2254,.8122,.2252,.8673,.2045,.945,.2046,.945,.2046,1,.2254,.8122,.2252,.8249,.3079,.8508,.2765,.0743,.2093,.6396,.2114,.6412,.2401,.5576,.2358,.5597,.207,.5576,.2358
                    ,.6412,.2401,.768,.7531,.7094,.7578,.7094,.7578,.6841,.7564,.2093,.3944,.8903,.3255,.8853,.3259,.8903,.3255,.9001,.3229,.8508,.2765,.925,.0504,.9387,.0842,.9317,.0836,.3569,.8169,.2784,.8319,.2783,.8263,.9001,.2756,.2317,.0991,.259,.101,.8775,.2045,.8122,.0974,.5378,.8968,.6396,.2114,.259,.101
                    ,.2783,.1026,.2019,.2113,.94,.0123,.9485,0,.9485,.039,.3569,.8169,.925,.0504,.8424,.337,.94,.0123,.943,.0463,.0743,.2093,.8775,.1131,.8865,.0842,.891,.0904,.8424,.337,.8122,.3414,.8249,.3079,.0993,.6699,.3558,.3301,.3866,.138,.6396,.673,.6631,.8638,.5435,.6729,.2093,.3944,.2498,.3975
                    ,.7245,.4649,.6899,.4638,.1806,.3928,.2093,.3944,.7245,.4649,.7245,.4649,.4093,.4744,.468,.6052,.4093,.4744,.5378,.5992,.6542,.5303,.6542,.5303,.2334,.5301,.2498,.3975,.2783,.4001,.2451,.8636,.5378,.996,.6631,.8638,.3866,.138,.3703,.0105,.7341,.0035,.7341,.0035,.6861,.1274,.1182,.9858
                ]),
                false);

            geo = (_B.Tools.Now - geo) / 1000;
            ret.setMaterialByID("Snowman_Generic3.ArmR");
            ret.subMeshes = [];
            new _B.SubMesh(0, 0, 274, 0, 516, ret);
            if (scene._selectionOctree) {
                scene.createOrUpdateSelectionOctree();
            }
        }
        if (this.postConstruction) this.postConstruction();
        ret.initComplete = true;
        load = (_B.Tools.Now - load) / 1000;
        _B.Tools.Log("defined mesh: " + ret.name + (cloning ? " (cloned)" : "") + " completed:  " + load.toFixed(2) + ", geometry:  " + geo.toFixed(2) + ", skey:  " + shape.toFixed(2) + " secs");
        return ret;
    }

    function child_ArmL(scene, parent, source){
        var ret = new BABYLON.Mesh(parent.name + ".ArmL", scene, parent, source);
        var cloning = source && source !== null;
        var load = _B.Tools.Now;
        var geo = 0;
        var shape = 0;
        ret.position.x  = -.5857;
        ret.position.y  = 1.0587;
        ret.position.z  = 1.6731;
        ret.rotation.x  = -.5948;
        ret.rotation.y  = 1.9339;
        ret.rotation.z  = 1.0377;
        ret.scaling.x   = 1.4009;
        ret.scaling.y   = 1.3464;
        ret.scaling.z   = 1.4006;

        ret.id = ret.name;
        ret.billboardMode  = 0;
        ret.isVisible  = false; //always false; evaluated again at bottom
        ret.setEnabled(true);
        ret.checkCollisions = false;
        ret.receiveShadows  = false;
        ret.castShadows  = false;
        ret.initComplete = false;
        if (!cloning){
            geo = _B.Tools.Now;
            ret.setVerticesData(_B.VertexBuffer.PositionKind, new Float32Array([
                    .0422,.8123,.0253,.005,1,.005,.0595,.809,.0179,.0071,1,0,.0667,.8076,0,.0071,1,0,.0595,.809,-.0179,.0667,.8076,0,.005,1,-.005,.0422,.8123,-.0253,.0595,.809,-.0179,0,1,-.0071,.0248,.8156,-.0179,-.005,1,-.005,.0176,.817,0,.0248,.8156,-.0179,-.0071,1,0
                    ,0,1,-.0071,.0071,1,0,-.005,1,.005,.0248,.8156,.0179,.0248,.8156,.0179,0,1,.0071,.0422,.8123,.0253,-.0551,-.8059,-.0501,-.0762,-.7844,-.0007,-.0556,-.7896,.0489,-.0341,.567,.0219,-.0153,.6136,.0299,-.0143,.56,.031,-.088,.6701,-.003,-.1377,.6881,-.0015,-.1394,.6887,-.006,-.0833,.6669,-.0158
                    ,-.1336,.6864,-.0123,-.0726,.6591,-.0211,-.0839,.667,.0098,-.1379,.6773,-.0013,-.1377,.6881,-.0015,.0055,.6062,-.0211,-.0113,.5596,-.031,.0085,.5527,-.0219,.0123,.6034,0,.0085,.5527,-.0219,.0157,.5502,0,.0063,.553,.0219,-.0143,.56,.031,.0037,.6064,.0211,.0363,.2598,.0375,.062,.2545,.0265,.0726,.2523,0
                    ,.062,.2545,-.0265,.0363,.2598,-.0375,.062,.2545,-.0265,.0106,.2652,-.0265,-.0321,.5668,-.0219,0,.2674,0,.0106,.2652,-.0265,-.0341,.567,.0219,.0106,.2652,.0265,.0106,.2652,.0265,.0363,.2598,.0375,-.1396,.6779,-.006,-.1377,.6881,-.0015,-.1379,.6773,-.0013,-.1376,.6881,-.0105,-.1378,.6773,-.0107,-.1336,.6864,-.0123
                    ,-.1378,.6773,-.0107,-.1336,.676,-.0126,-.0909,.6133,-.003,-.1378,.6773,-.0107,-.1396,.6779,-.006,-.1376,.6881,-.0105,-.1379,.6773,-.0013,-.0867,.6101,.0103,-.0726,.6591,-.0211,-.0746,.6022,-.0218,-.0858,.61,-.0163,-.1336,.676,-.0126,-.1378,.6773,-.0107,-.0336,.6207,.0211,.0422,.8123,.0253,-.0336,.6207,.0211,-.0406,.6223,0
                    ,-.032,.6195,-.0211,-.0128,.6133,-.0299,-.032,.6195,-.0211,.0595,.809,-.0179,.0055,.6062,-.0211,.0422,.8123,.0253,.0037,.6064,.0211,-.0321,.5668,-.0219,-.0746,.6022,-.0218,-.0858,.61,-.0163,-.0414,.5697,0,-.0341,.567,.0219,-.0406,.6223,0,-.032,.6195,-.0211,-.0858,.61,-.0163,-.0867,.6101,.0103,-.032,.6195,-.0211
                    ,-.0128,.6133,-.0299,-.0406,.6223,0,-.0839,.667,.0098,-.0445,-.6058,.0426,-.034,-.2513,.0505,-.0022,-.6075,.0603,-.0619,-.605,0,-.0692,-.2481,.0357,-.0445,-.6058,.0426,-.0692,-.2481,-.0357,-.0445,-.6058,-.0426,-.034,-.2513,-.0505,-.0445,-.6058,-.0426,-.0022,-.6075,-.0603,.0012,-.2545,-.0357,.0401,-.6092,-.0426,.0158,-.2558,0
                    ,.0401,-.6092,-.0426,.0576,-.6099,0,.0401,-.6092,.0426,.0012,-.2545,.0357,.0401,-.6092,.0426,-.0312,.0212,.0311,-.0692,-.2481,.0357,.0363,.2598,.0375,-.0008,.0165,.044,-.0838,-.2467,0,-.0312,.0212,.0311,-.044,.0235,0,.0106,.2652,.0265,-.0312,.0212,-.0311,.0106,.2652,-.0265,-.044,.0235,0,-.0312,.0212,-.0311
                    ,-.0692,-.2481,-.0357,-.0312,.0212,-.0311,-.0008,.0165,-.044,.062,.2545,-.0265,.0294,.0123,-.0311,.0294,.0123,-.0311,.0012,-.2545,-.0357,.0294,.0123,-.0311,.0421,.0104,0,.0294,.0123,.0311,.0012,-.2545,.0357,.062,.2545,.0265,.0294,.0123,.0311,-.0049,-.8317,.0701,.0453,-.8529,.0491,.0659,-.8577,-.0004,.0449,-.8395,-.05
                    ,-.0048,-.8333,-.0705,.0449,-.8395,-.05,-.0551,-.8059,-.0501,-.0762,-.7844,-.0007,-.0551,-.8059,-.0501,-.0762,-.7844,-.0007,-.0445,-.6058,.0426,-.0556,-.7896,.0489,-.0556,-.7896,.0489,-.0049,-.8317,.0701,0,1,.0071,.0071,1,0,.005,1,-.005,-.005,1,-.005,-.0071,1,0,.0071,1,0,.005,1,.005
                    ,0,1,.0071,0,1,.0071,-.005,1,.005,-.005,1,-.005,0,1,-.0071,0,1,-.0071,.005,1,-.005,.0071,1,0,.0071,1,0,0,1,.0071,-.0071,1,0,.0248,.8156,.0179,-.005,1,.005,-.0049,-.8317,.0701,-.0049,-.8317,.0701,.0453,-.8529,.0491,.0449,-.8395,-.05
                    ,.0453,-.8529,.0491,.0659,-.8577,-.0004,.0449,-.8395,-.05,.0449,-.8395,-.05,-.0048,-.8333,-.0705,-.0049,-.8317,.0701,-.0048,-.8333,-.0705,-.0049,-.8317,.0701,-.0839,.667,.0098,-.1376,.6881,-.0105,-.0867,.6101,.0103,.0055,.6062,-.0211,.0085,.5527,-.0219,-.0143,.56,.031,-.0153,.6136,.0299,-.0143,.56,.031,.0085,.5527,-.0219
                    ,-.0321,.5668,-.0219,-.0414,.5697,0,-.0414,.5697,0,-.0341,.567,.0219,.0106,.2652,.0265,-.1394,.6887,-.006,-.1377,.6881,-.0015,-.1394,.6887,-.006,-.1336,.6864,-.0123,-.1376,.6881,-.0105,-.1378,.6773,-.0107,-.0858,.61,-.0163,-.1378,.6773,-.0107,-.1376,.6881,-.0105,-.1396,.6779,-.006,-.1379,.6773,-.0013,-.0726,.6591,-.0211
                    ,-.1336,.6864,-.0123,-.0746,.6022,-.0218,-.1336,.676,-.0126,.0248,.8156,.0179,.0422,.8123,.0253,-.0336,.6207,.0211,.0248,.8156,-.0179,.0595,.809,-.0179,.0595,.809,-.0179,.0055,.6062,-.0211,.0422,.8123,.0253,.0595,.809,.0179,.0037,.6064,.0211,-.0321,.5668,-.0219,-.0113,.5596,-.031,-.0746,.6022,-.0218,-.0726,.6591,-.0211
                    ,-.0406,.6223,0,-.0321,.5668,-.0219,-.0858,.61,-.0163,-.0867,.6101,.0103,-.032,.6195,-.0211,-.0406,.6223,0,-.0336,.6207,.0211,-.0839,.667,.0098,-.0692,-.2481,.0357,-.0692,-.2481,-.0357,-.0445,-.6058,-.0426,.0012,-.2545,-.0357,.0401,-.6092,-.0426,.0012,-.2545,.0357,.0106,.2652,.0265,.0363,.2598,.0375,-.044,.0235,0
                    ,-.0312,.0212,.0311,0,.2674,0,.0106,.2652,.0265,-.044,.0235,0,.0106,.2652,-.0265,-.044,.0235,0,-.0312,.0212,-.0311,-.0312,.0212,-.0311,.062,.2545,-.0265,.0294,.0123,-.0311,.0294,.0123,-.0311,.0294,.0123,.0311,.0363,.2598,.0375,.062,.2545,.0265,-.0022,-.6075,.0603,.0401,-.6092,-.0426,-.0445,-.6058,-.0426
                    ,-.0551,-.8059,-.0501,-.0762,-.7844,-.0007,-.0762,-.7844,-.0007,-.0445,-.6058,.0426,-.0556,-.7896,.0489
                ]),
                false);

            var _i;//indices & affected indices for shapekeys
            _i = new Uint32Array(516);
            _i.set([0,1,2]);
            CONTIG(_i, 3, 2, 12);
            _i.set([9,13,14,15,16,17,18,14], 14);
            CONTIG(_i, 22, 19, 45);
            _i.set([42,44,46,47,45,48,45,49,49,44,50,44,51,50,41,52,53,40,54,52,55,56,57,56,58,59,60,29,61,62,63,64,65,62,66,67,68,69,70,71,72,30,73,33,70,74,75,76,69,77
                ,78,79,80,81,82,28,14,83,84,85,14,84,86,12,87,88,86,39,4,89,42,2,42,47,90,91,28,92,93,94,86,77,40,95,75,96,97,33,98,95,99,70,81,100,36,101,35,102,103,104
                ,30,105,106,107,108,109,110,111,108,112,113,114,115,116,115,117,118,119,120,121,118,120,107,122,123,124,106,125,124,126,127,128,129,109,130,131,124,132,128,111,133,134,132,113,135,136,52,137,138,116
                ,138,113,139,138,140,118,141,142,50,143,144,145,118,146,145,50,144,127,122,106,127,147,148,149,121,150,150,120,151,120,152,151,117,153,154,115,155,153,112,156,157,158,159,160,161,107,162,0,163,1
                ,2,1,3,164,165,6,8,11,9,11,166,12,13,167,14,168,169,170,171,172,16,16,173,174,175,176,177,178,179,16,14,180,19,181,182,22,26,183,24], 49);
            CONTIG(_i, 288, 184, 193);
            _i.set([24,194,27,81,28,30,195,31,33,196,34,36,197,37,39,86,40,42,198,199,45,47,42,200,201,47,48,202,45,49,45,44,44,203,51,41,40,52,40,204,54,55,205,56,56,206,207,208,27,29
                ,62,209,210,65,211,62,212,213,214,70,215,216,30,32,217,70,218,219,220,221,69,78,222,223,81,224,225,14,20,226,85,227,14,86,9,12,228,9,86,4,229,230,2,4,42,231,232,233,234,235
                ,236,86,237,77,95,70,75,238,30,33,95,239,240,81,27,241,242,33,35,243,244,245,105,246,106,108,128,109,111,128,108,113,247,248,116,113,115,118,249,250,121,251,118,107,106,122,124,127,106,124
                ,252,253,128,254,255,130,256,257,132,258,128,259,56,260,113,138,261,52,54,262,116,140,138,263,52,138,118,144,264,50,51,265,145,144,118,145,49,50,127,266,122,127,267,268,149,269,121,150,121,120
                ,120,270,152,117,115,153,115,271,272,112,108,273,274,108,275,276,105,107], 298);
            ret.setIndices(_i);

            ret.setVerticesData(_B.VertexBuffer.NormalKind, new Float32Array([
                    .0722,.0669,.9951,.4729,.7181,.5105,.7428,.0295,.6688,.6724,.7401,0,.9999,.0089,.0013,.6724,.7401,0,.7431,.0327,-.6683,.9999,.0089,.0013,.4729,.7181,-.5105,.0709,.0682,-.9951,.7431,.0327,-.6683,-.0417,.661,-.7492,-.6746,.0745,-.7344,-.5859,.6027,-.5417,-.9973,.0735,-.0013,-.6746,.0745,-.7344,-.8152,.5792,0
                    ,-.0417,.661,-.7492,.6724,.7401,0,-.5859,.6027,.5417,-.6735,.0772,.7351,-.6735,.0772,.7351,-.0417,.661,.7492,.0722,.0669,.9951,-.7256,-.4463,-.5237,-.939,-.3424,.0307,-.7381,-.3125,.598,-.6539,-.182,.7343,-.0392,.0195,.999,-.0221,.0133,.9997,.4946,.869,.0135,-.378,.6907,.6165,-.6351,.7724,-.0055,.4814,.8384,-.2554
                    ,.0203,.669,-.7429,.4629,.6527,-.5997,.3315,.6391,.6939,-.7027,-.2266,.6745,-.378,.6907,.6165,.7243,-.064,-.6865,.0289,-.0209,-.9994,.7464,.0983,-.6581,.995,-.0912,.0408,.7464,.0983,-.6581,.9905,.1307,.0429,.7121,.0961,.6954,-.0221,.0133,.9997,.6935,-.0647,.7176,.0459,.0337,.9984,.735,.0303,.6774,.9997,.0229,0
                    ,.7352,.0297,-.6771,.0449,.0333,-.9984,.7352,.0297,-.6771,-.6941,.0213,-.7195,-.6745,-.4415,-.5916,-.9999,.0128,-.0011,-.6941,.0213,-.7195,-.6539,-.182,.7343,-.6942,.0185,.7196,-.6942,.0185,.7196,.0459,.0337,.9984,-.9643,-.2644,-.0116,-.378,.6907,.6165,-.7027,-.2266,.6745,-.4072,.7178,-.5647,-.7552,-.2496,-.606,.0203,.669,-.7429
                    ,-.7552,-.2496,-.606,-.3386,-.1102,-.9344,-.7514,-.6595,-.0209,-.7552,-.2496,-.606,-.9643,-.2644,-.0116,-.4072,.7178,-.5647,-.7027,-.2266,.6745,-.6044,-.4617,.6493,.4629,.6527,-.5997,-.4812,-.4506,-.7519,-.6963,-.6063,-.384,-.3386,-.1102,-.9344,-.7552,-.2496,-.606,-.3891,.2558,.8849,.0722,.0669,.9951,-.3891,.2558,.8849,-.0595,.9977,-.0304
                    ,.0324,.9994,-.0107,.09,.0564,-.9943,.0324,.9994,-.0107,.7431,.0327,-.6683,.7243,-.064,-.6865,.0722,.0669,.9951,.6935,-.0647,.7176,-.6745,-.4415,-.5916,-.4812,-.4506,-.7519,-.6963,-.6063,-.384,-.8403,-.5412,-.0292,-.6539,-.182,.7343,-.0595,.9977,-.0304,.0324,.9994,-.0107,-.6963,-.6063,-.384,-.6044,-.4617,.6493,.0324,.9994,-.0107
                    ,.09,.0564,-.9943,-.0595,.9977,-.0304,.3315,.6391,.6939,-.7016,.0169,.7123,-.0241,.0243,.9994,.0149,.0394,.9991,-.9999,.0086,.0004,-.7211,.0377,.6918,-.7016,.0169,.7123,-.7211,.0377,-.6918,-.7013,.0173,-.7126,-.0241,.0243,-.9994,-.7013,.0173,-.7126,.0147,.04,-.9991,.6981,.0149,-.7158,.7144,.0644,-.6968,.9999,.0121,0
                    ,.7144,.0644,-.6968,.9973,.074,.0003,.7144,.0634,.6968,.6981,.0149,.7158,.7144,.0634,.6968,-.6984,.1213,.7053,-.7211,.0377,.6918,.0459,.0337,.9984,.0014,.0253,.9997,-.999,.0442,0,-.6984,.1213,.7053,-.9869,.1611,0,-.6942,.0185,.7196,-.6984,.1213,-.7053,-.6941,.0213,-.7195,-.9869,.1611,0,-.6984,.1213,-.7053
                    ,-.7211,.0377,-.6918,-.6984,.1213,-.7053,.0014,.0253,-.9997,.7352,.0297,-.6771,.7051,-.0718,-.7054,.7051,-.0718,-.7054,.6981,.0149,-.7158,.7051,-.0718,-.7054,.9937,-.1116,0,.7051,-.0718,.7054,.6981,.0149,.7158,.735,.0303,.6774,.7051,-.0718,.7054,-.2147,-.5983,.772,.3663,-.754,.5452,.6003,-.7965,-.0718,.4835,-.6291,-.6086
                    ,-.144,-.6386,-.7559,.4835,-.6291,-.6086,-.7256,-.4463,-.5237,-.939,-.3424,.0307,-.7256,-.4463,-.5237,-.939,-.3424,.0307,-.7016,.0169,.7123,-.7381,-.3125,.598,-.7381,-.3125,.598,-.2147,-.5983,.772,-.0417,.661,.7492,.6724,.7401,0,.4729,.7181,-.5105,-.5859,.6027,-.5417,-.8152,.5792,0,.6724,.7401,0,.4729,.7181,.5105
                    ,-.0417,.661,.7492,-.0417,.661,.7492,-.5859,.6027,.5417,-.5859,.6027,-.5417,-.0417,.661,-.7492,-.0417,.661,-.7492,.4729,.7181,-.5105,.6724,.7401,0,.6724,.7401,0,-.0417,.661,.7492,-.8152,.5792,0,-.6735,.0772,.7351,-.5859,.6027,.5417,-.2147,-.5983,.772,-.2147,-.5983,.772,.3663,-.754,.5452,.4835,-.6291,-.6086
                    ,.3663,-.754,.5452,.6003,-.7965,-.0718,.4835,-.6291,-.6086,.4835,-.6291,-.6086,-.144,-.6386,-.7559,-.2147,-.5983,.772,-.144,-.6386,-.7559,-.2147,-.5983,.772,.3315,.6391,.6939,-.4072,.7178,-.5647,-.6044,-.4617,.6493,.7243,-.064,-.6865,.7464,.0983,-.6581,-.0221,.0133,.9997,-.0392,.0195,.999,-.0221,.0133,.9997,.7464,.0983,-.6581
                    ,-.6745,-.4415,-.5916,-.8403,-.5412,-.0292,-.8403,-.5412,-.0292,-.6539,-.182,.7343,-.6942,.0185,.7196,-.6351,.7724,-.0055,-.378,.6907,.6165,-.6351,.7724,-.0055,.0203,.669,-.7429,-.4072,.7178,-.5647,-.7552,-.2496,-.606,-.6963,-.6063,-.384,-.7552,-.2496,-.606,-.4072,.7178,-.5647,-.9643,-.2644,-.0116,-.7027,-.2266,.6745,.4629,.6527,-.5997
                    ,.0203,.669,-.7429,-.4812,-.4506,-.7519,-.3386,-.1102,-.9344,-.6735,.0772,.7351,.0722,.0669,.9951,-.3891,.2558,.8849,-.6746,.0745,-.7344,.7431,.0327,-.6683,.7431,.0327,-.6683,.7243,-.064,-.6865,.0722,.0669,.9951,.7428,.0295,.6688,.6935,-.0647,.7176,-.6745,-.4415,-.5916,.0289,-.0209,-.9994,-.4812,-.4506,-.7519,.4629,.6527,-.5997
                    ,-.0595,.9977,-.0304,-.6745,-.4415,-.5916,-.6963,-.6063,-.384,-.6044,-.4617,.6493,.0324,.9994,-.0107,-.0595,.9977,-.0304,-.3891,.2558,.8849,.3315,.6391,.6939,-.7211,.0377,.6918,-.7211,.0377,-.6918,-.7013,.0173,-.7126,.6981,.0149,-.7158,.7144,.0644,-.6968,.6981,.0149,.7158,-.6942,.0185,.7196,.0459,.0337,.9984,-.9869,.1611,0
                    ,-.6984,.1213,.7053,-.9999,.0128,-.0011,-.6942,.0185,.7196,-.9869,.1611,0,-.6941,.0213,-.7195,-.9869,.1611,0,-.6984,.1213,-.7053,-.6984,.1213,-.7053,.7352,.0297,-.6771,.7051,-.0718,-.7054,.7051,-.0718,-.7054,.7051,-.0718,.7054,.0459,.0337,.9984,.735,.0303,.6774,.0149,.0394,.9991,.7144,.0644,-.6968,-.7013,.0173,-.7126
                    ,-.7256,-.4463,-.5237,-.939,-.3424,.0307,-.939,-.3424,.0307,-.7016,.0169,.7123,-.7381,-.3125,.598
                ]),
                false);

            ret.setVerticesData(_B.VertexBuffer.UVKind, new Float32Array([
                    .6346,.1015,.6444,.0001,.6526,.1035,.6517,.0001,.6785,.1044,.898,.2456,.8824,.163,.907,.16,.194,.99,.243,.8887,.2662,.887,.1872,.99,.2196,.8906,.8699,.08,.8478,.1775,.8219,.1776,.8969,.2519,.8879,.2485,.898,.2456,.8824,.0803,.8662,.1785,.4809,.0993,.4469,0,.5062,.1012,.8219,.0242
                    ,.8697,0,.9417,.0006,.406,.2332,.4341,.2082,.4351,.2371,.9258,.1079,.9322,.0806,.9385,.08,.942,.1118,.9459,.0836,.9471,.1192,.339,.1793,.2662,.1736,.2665,.1678,.1924,.778,.1695,.7528,.1961,.7492,.647,.2135,.6714,.2407,.6477,.2422,.6156,.2405,.594,.2364,.6163,.2117,.6061,.3985,.6327,.4018
                    ,.6711,.4032,.6987,.4019,.2319,.5914,.2662,.5886,.1973,.5945,.7927,.7386,.7834,.5785,.8219,.5773,.7372,.7389,.756,.5777,.4601,.3955,.4976,.3985,.8891,.2577,.8939,.2522,.894,.258,.8827,.2522,.8824,.258,.0057,.8216,0,.8167,.0056,.816,.8668,.338,.8886,.3763,.8827,.3776,.9441,.0812,.8762,.377
                    ,.8482,.3361,.0876,.8066,.0847,.776,.8887,.2908,.8963,.3271,.8928,.3284,.407,.2043,.5062,.1012,.8824,.2851,.8599,.2839,.8291,.2846,.1679,.7817,.142,.7852,.2662,.887,.6699,.2119,.5062,.1012,.4533,.2119,.8801,.2972,.8887,.3263,.8836,.3339,.8524,.3037,.8219,.301,.9117,.1432,.9385,.1491,.8836,.3339
                    ,.3351,.2099,.9385,.1491,.9471,.16,.9117,.1432,.9079,.1099,.3878,.8642,.4095,.6737,.4493,.8653,.7553,.1082,.7056,.3002,.7114,.1084,.7943,.2997,.8172,.1079,.1344,.3165,.118,.126,.1751,.1247,.1815,.3149,.2317,.124,.6327,.6756,.6914,.8661,.6473,.8666,.5854,.8659,.446,.6751,.4933,.8659,.407,.5268
                    ,.3582,.6717,.4976,.3985,.4512,.5295,.7424,.3004,.7298,.4457,.3754,.525,.4601,.3955,.807,.4452,.8219,.5773,.7617,.4464,.1396,.4633,.0869,.3185,.1396,.4633,.1805,.4605,.2662,.5886,.2209,.4584,.6833,.5317,.6697,.6748,.6833,.5317,.651,.5328,.6058,.5316,.5808,.6746,.5241,.4012,.4824,.5315,.5241,.9849
                    ,.5754,.997,.6474,1,.6987,.9901,.1703,.0031,.2368,0,.1026,.0183,.7495,.0115,.8219,0,.7495,.0115,.7114,.1084,.6987,.0094,.3745,.9631,.4479,.9861,.6393,0,.898,.2456,.8911,.2464,.1804,.99,.8772,.0802,.898,.2456,.9046,.2467,.907,.2489,.907,.2489,.9038,.2511,.8903,.2508,.8879,.2485
                    ,.8879,.2485,.8911,.2464,.898,.2456,.898,.2456,.907,.2489,.8772,.0802,.4809,.0993,.4396,0,1,.029,1,.029,1,.0602,.8725,.076,1,.0602,.9479,.08,.8725,.076,.8725,.076,.8242,.0569,1,.029,.8242,.0569,1,.029,.9079,.1099,.9441,.0812,.3351,.2099,.6699,.2119,.6714,.2407
                    ,.594,.2364,.5959,.2076,.594,.2364,.6714,.2407,.1416,.7569,.7607,.7401,.7607,.7401,.7372,.7389,.4601,.3955,.8892,.2519,.8939,.2522,.8892,.2519,.0057,.8216,.0003,.8225,0,.8167,.8836,.3339,.8886,.3763,.9441,.0812,.8827,.3776,.8762,.377,.0876,.8066,.0057,.8216,.8963,.2851,.8963,.3271,.4809,.0993
                    ,.5062,.1012,.8824,.2851,.8219,.1776,.2662,.887,.6971,.1036,.6699,.2119,.5062,.1012,.5241,.1028,.4533,.2119,.8801,.2972,.8887,.2851,.8887,.3263,.0876,.8066,.9117,.1432,.8801,.2972,.8836,.3339,.3351,.2099,.9385,.1491,.9117,.1432,.8824,.1455,.9079,.1099,.3582,.6717,.0869,.3185,.118,.126,.6697,.6748
                    ,.6914,.8661,.5808,.6746,.4601,.3955,.4976,.3985,.7617,.4464,.7298,.4457,.4336,.3938,.4601,.3955,.7617,.4464,.8219,.5773,.7617,.4464,.1396,.4633,.1396,.4633,.2662,.5886,.6833,.5317,.6833,.5317,.4824,.5315,.4976,.3985,.5241,.4012,.5419,.8644,.6914,.8661,.118,.126,.1026,.0183,.7495,.0115,.7495,.0115
                    ,.7114,.1084,.3745,.9631
                ]),
                false);

            geo = (_B.Tools.Now - geo) / 1000;
            ret.setMaterialByID("Snowman_Generic3.ArmL");
            ret.subMeshes = [];
            new _B.SubMesh(0, 0, 277, 0, 516, ret);
            if (scene._selectionOctree) {
                scene.createOrUpdateSelectionOctree();
            }
        }
        if (this.postConstruction) this.postConstruction();
        ret.initComplete = true;
        load = (_B.Tools.Now - load) / 1000;
        _B.Tools.Log("defined mesh: " + ret.name + (cloning ? " (cloned)" : "") + " completed:  " + load.toFixed(2) + ", geometry:  " + geo.toFixed(2) + ", skey:  " + shape.toFixed(2) + " secs");
        return ret;
    }

    function defineCameras(scene, positionOffset) {
        var camera;

        camera = new _B.UniversalCamera("Camera", new _B.Vector3(7.4811,5.3437,-6.5076), scene);
        if (positionOffset) camera.position.addInPlace(positionOffset);
        camera.setCameraRigMode(0,{interaxialDistance: .0637});
        camera.rotation = new _B.Vector3(.4615,-.8149,0);
        camera.fov = .8576;
        camera.minZ = .1;
        camera.maxZ = 100;
        camera.speed = 1;
        camera.inertia = 0.9;
        camera.checkCollisions = false;
        camera.applyGravity = false;
        camera.ellipsoid = new _B.Vector3(.2,.9,.2);
        scene.setActiveCameraByID("Camera");
    }
    Snowman_Generic3.defineCameras = defineCameras;

    function defineLights(scene, positionOffset) {
        var light;

        light = new _B.PointLight("Lamp", new _B.Vector3(4.0762,5.9039,1.0055), scene);
        if (positionOffset) light.position.addInPlace(positionOffset);
        light.intensity = 1;
        light.diffuse = new _B.Color3(1,1,1);
        light.specular = new _B.Color3(1,1,1);
    }
    Snowman_Generic3.defineLights = defineLights;
})(Snowman_Generic3 || (Snowman_Generic3 = {}));