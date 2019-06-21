var MAX_POKEMON = 151;
var SRC_POKE_PER_ROW = 13;
var POKE_PER_ROW = 16;
var POKE_RESOLUTION = 32;

var currentColor = "color1";

var lastSyncTime = null;
// interval in miliseconds to check if the boards are in sync
var SYNC_INTERVAL = 15000;

function makeBoard() {
    POKE_PER_ROW = Number($("#poke-per-row").val());

    currentColor = "color1";
    $board = $("#board");
    for (var i = 0; i < MAX_POKEMON; i++) {
        var bgStyle = "background: url(img/poke_sprites.png)";
        bgStyle += " -" + (i % SRC_POKE_PER_ROW) * POKE_RESOLUTION + "px";
        bgStyle +=
            " -" + Math.floor(i / SRC_POKE_PER_ROW) * POKE_RESOLUTION + "px";
        var pokeImg = "<div class='poke-img' style='" + bgStyle + "'></div>";

        $board.append(
            "<div class='poke' onclick='pokeClick(this)' data-poke-id='" +
                (i + 1) +
                "'>" +
                pokeImg +
                "</div>"
        );
        if (i % POKE_PER_ROW === POKE_PER_ROW - 1) {
            $board.append("<br>");
        }
    }
    // didn't just put in a linebreak, but within 3 of the end of the line
    if (i % POKE_PER_ROW !== 0 && i % POKE_PER_ROW > POKE_PER_ROW - 3) {
        $board.append("<br>");
        i += POKE_PER_ROW - (i % POKE_PER_ROW);
    }

    $board.append("<div class='square-thing'></div>");
    var color1Class =
        "square-thing color1" + (currentColor === "color1" ? " chosen" : "");
    $board.append(
        "<div id='chooser-color1' class='" +
            color1Class +
            "' onclick='chooseColor(\"color1\")'></div>"
    );
    var color2Class =
        "square-thing color2" + (currentColor === "color2" ? " chosen" : "");
    $board.append(
        "<div id='chooser-color2' class='" +
            color2Class +
            "' onclick='chooseColor(\"color2\")'></div>"
    );
    var color3Class =
        "square-thing color3" + (currentColor === "color3" ? " chosen" : "");
    $board.append(
        "<div id='chooser-color3' class='" +
            color3Class +
            "' onclick='chooseColor(\"color3\")'></div>"
    );

    i += 3;
    if (i % POKE_PER_ROW > POKE_PER_ROW - 3) {
        $board.append("<br>");
    }

    $board.append(
        "<div id='connection1-status' class='square-thing good' title='connection 1 status'></div>"
    );
    $board.append(
        "<div id='connection2-status' class='square-thing good' title='connection 2 status'></div>"
    );
    $board.append(
        "<div id='poke-count-color1' class='square-thing text-color1'><div>0</div></div>"
    );
    $board.append(
        "<div id='poke-count-color2' class='square-thing text-color2'><div>0</div></div>"
    );
    $board.append(
        "<div id='poke-count-color3' class='square-thing text-color3'><div>0</div></div>"
    );

    i += 1;
    if (i % POKE_PER_ROW > POKE_PER_ROW - 1) {
        $board.append("<br>");
    }
    $board.append("<div id='new-game-button' class='square-thing'></div>");

    if (CONNECTION_INFO1.connectionMode === "master") {
        lastSyncTime1 = $.now();
    }
    if (CONNECTION_INFO2.connectionMode === "master") {
        lastSyncTime2 = $.now();
    }

    $(".poke").mousedown(function(e) {
        if (e.which === 3) {
            $(this).toggleClass("marked");
        }
    });

    $("#new-game-button").click(function() {
        var btns =
            "<button id='yesbtn'>Yes</button><button id='nobtn'>No</button>";
        $("#board").append(
            "<div id='new-game-dialog'>Are you sure you want to clear the board? " +
                btns +
                "</div>"
        );
        $("#nobtn").click(function() {
            $("#new-game-dialog").remove();
        });
        $("#yesbtn").click(function() {
            $("#new-game-dialog").remove();
            newGame();
        });
    });
}

function boardSync() {
    if ($.now() - lastSyncTime > SYNC_INTERVAL) {
        if (isConnected()) {
            sendMessage("sync", { sync_event: "start" });
            $("#sync-cover").show();
        }
    }
}

function syncHandler(syncData) {
    switch (syncData.sync_event) {
        case "start":
            sendMessage("sync", { sync_event: "start-received" });
            $("#sync-cover").show();
            break;
        case "start-received":
            var boardData = serializeBoard();
            sendMessage("sync", {
                sync_event: "sync-board",
                board_data: boardData
            });
            break;
        case "sync-board":
            var result = compareBoard(syncData.board_data);
            sendMessage("sync", {
                sync_event: "sync-board-response",
                result: result
            });
            if (!result) {
                connectionWarning();
            } else if ($("#connection-status").hasClass("warning")) {
                goodConnection(CONNECTION_INFO1);
                goodConnection(CONNECTION_INFO2);
            }
            $("#sync-cover").hide();
            break;
        case "sync-board-response":
            lastSyncTime = $.now();
            if (!syncData.result) {
                connectionWarning();
            } else if ($("#connection-status").hasClass("warning")) {
                goodConnection(CONNECTION_INFO1);
                goodConnection(CONNECTION_INFO2);
            }
            $("#sync-cover").hide();
            break;
        case "force-sync":
            forceSyncBoard(syncData.board_data);
            break;
        case "force-sync-request":
            forceBoardSyncMessage(true);
            break;
    }
}

function compareBoard(theirBoard) {
    var myBoard = serializeBoard();
    return JSON.stringify(myBoard) === JSON.stringify(theirBoard);
}

function forceSyncBoard(theirBoard) {
    for (var i = 1; i < MAX_POKEMON + 1; i++) {
        var pokeColor = theirBoard[i].color;
        var $poke = $(".poke[data-poke-id='" + i + "']");
        $poke.removeClass("color1 color2 color3");
        if (
            pokeColor === "color1" ||
            pokeColor === "color2" ||
            pokeColor === "color3"
        ) {
            $poke.addClass(pokeColor);
        }
    }
    updatePokeCounts();
    $("#sync-cover").hide();
    goodConnection(CONNECTION_INFO1);
    goodConnection(CONNECTION_INFO2);
}

function newGame() {
    if (!isConnected()) {
        clearBoard();
        return false;
    }
    sendMessage("clearBoard", true);
    clearBoard();

    // we know the board isn't out of sync
    goodConnection(CONNECTION_INFO1);
    goodConnection(CONNECTION_INFO2);
}

function clearBoard() {
    for (var i = 1; i < MAX_POKEMON + 1; i++) {
        var $poke = $(".poke[data-poke-id='" + i + "']");
        $poke.removeClass("color1 color2 color3 marked");
    }
    updatePokeCounts();
}

function serializeBoard() {
    $pokes = $(".poke");
    var data = {};
    $pokes.each(function(i, elem) {
        var $elem = $(elem);
        var color = $elem.hasClass("color1")
            ? "color1"
            : $elem.hasClass("color2")
            ? "color2"
            : "none";
        data[$elem.attr("data-poke-id")] = { color: color };
    });
    return data;
}

function goodConnection(info) {
    info.connected = true;
    $(info.statusClass).removeClass("bad");
    $(info.statusClass).removeClass("warning");
    $(info.statusClass).addClass("good");

    $(info.statusClass).attr("title", "Connected");
}

function badConnection(info) {
    info.connected = false;
    $(info.statusClass).removeClass("good");
    $(info.statusClass).removeClass("warning");
    $(info.statusClass).addClass("bad");

    $(info.statusClass).attr("title", "Connection Lost");
}

function connectionWarning(info) {
    $(info.statusClass).removeClass("good");
    $(info.statusClass).removeClass("bad");
    $(info.statusClass).addClass("warning");

    $(info.statusClass).attr(
        "title",
        "Pokedex Out Of Sync (click to synchronize)"
    );
}

function pokeClick(poke) {
    $poke = $(poke);
    var poke_id = $poke.attr("data-poke-id");
    if ($poke.hasClass(currentColor)) {
        $poke.removeClass(currentColor);
        sendEvent({ poke_id: poke_id, action: "unset", color: currentColor });
    } else if (!isMarkedByOther($poke, currentColor)) {
        $poke.addClass(currentColor);
        sendEvent({ poke_id: poke_id, action: "set", color: currentColor });
    }
    updatePokeCounts();
}

function otherColors(color) {
    return ["color1", "color2", "color3"].filter(function(c) {
        return c !== color;
    });
}

function isMarkedByOther(poke, color) {
    var other = otherColors(color);
    for (var i = 0; i < other.length; i++) {
        var otherColor = other[i];
        if (poke.hasClass(otherColor)) {
            return true;
        }
    }
    return false;
}

function blankPoke(poke_id, color) {
    $poke = $(".poke[data-poke-id='" + poke_id + "']");
    if ($poke.length < 1) {
        console.log("couldn't find poke!");
        return false;
    }

    if ($poke.hasClass(color)) {
        $poke.removeClass(color);
        return true; // removed it
    } else {
        return false; // can't remove it
    }
}

function setPoke(poke_id, color) {
    $poke = $(".poke[data-poke-id='" + poke_id + "']");
    if ($poke.length < 1) {
        console.log("couldn't find poke!");
        return false;
    }

    if ($poke.hasClass(color)) {
        return "already set"; // already that color
    } else if (isMarkedByOther($poke, color)) {
        return false; // can't set it
    } else {
        $poke.addClass(color);
        return true; // set it
    }
}

function receivedPokeEvent(data) {
    var result;
    if (data.action === "set") {
        result = setPoke(data.poke_id, data.color);
    } else if (data.action === "unset") {
        result = blankPoke(data.poke_id, data.color);
    }
    updatePokeCounts();

    if (result === false) {
        console.log("failed to " + data.action);
    } else if (result === "already set") {
        console.log("tryed to set poke to same color from event");
    }
}

function updatePokeCounts() {
    var color1Count = $(".poke.color1").length;
    $("#poke-count-color1 div").text(color1Count);
    var color2Count = $(".poke.color2").length;
    $("#poke-count-color2 div").text(color2Count);
    var color3Count = $(".poke.color3").length;
    $("#poke-count-color3 div").text(color3Count);
}

function chooseColor(color) {
    if (currentColor === color) {
        return;
    }
    $("#chooser-" + currentColor).removeClass("chosen");
    $("#chooser-" + color).addClass("chosen");
    currentColor = color;
}
