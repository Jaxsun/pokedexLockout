// connection is considered dead after this long without a message (we try to send a heartbeat every second so this shouldn't happen)
var CONNECTION_DEAD_AFTER = 2200;

var CFG = {
    iceServers: [{ urls: "stun:stun.beam.pro" }, { urls: "stun:stun.gmx.net" }]
};
var CON = { optional: [{ DtlsSrtpKeyAgreement: true }] };
var sdpConstraints = { optional: [] };

var CONNECTION_INFO1 = {
    connectionMode: null,
    connected: false,
    lastMessageTime: null,
    statusClass: "#connection1-status"
};

var CONNECTION_INFO2 = {
    connectionMode: null,
    connected: false,
    lastMessageTime: null,
    statusClass: "#connection2-status"
};

var peerConnection1 = new RTCPeerConnection(CFG, CON);
var peerConnection2 = new RTCPeerConnection(CFG, CON);

var dataChannel1 = null;
var dataChannel2 = null;

// when we need to send a message to the other person, do it like this
peerConnection1.onicecandidate = function(e) {
    if (e.candidate === null) {
        CONNECTION_INFO1.offerAnswer = JSON.stringify(
            peerConnection1.localDescription
        );
    }

    var htmlStuff =
        "<input id='copyMe-1' type='text'> <button onclick='copyMyThingToClipboard1()'>Copy to clipboard</button>";
    if (CONNECTION_INFO1.connectionMode === "master") {
        htmlStuff =
            "Conection info generated.<br>Send this text to whoever is connecting and have them paste it into this page:<br>" +
            htmlStuff;
        htmlStuff += "<br><button id='sent-button-1'>Ok did it</button>";
    } else if (CONNECTION_INFO1.connectionMode === "slave") {
        htmlStuff =
            "Connection info processed.<br>Send this text back to whoever initiated the conection.<br>" +
            htmlStuff;
    }
    $("#setup-1").html(htmlStuff);
    $("#copyMe-1").val(CONNECTION_INFO1.offerAnswer);

    if (CONNECTION_INFO1.connectionMode === "master") {
        $("#sent-button-1").click(function() {
            var htmlStuff = "Paste their response here: ";
            htmlStuff +=
                "<input id='remote-val-1' type='text'> <button id='ok-button-1'>Ok</button>";
            $("#setup-1").html(htmlStuff);

            $("#ok-button-1").click(function() {
                peerConnection1.setRemoteDescription(
                    new RTCSessionDescription(
                        JSON.parse($("#remote-val-1").val())
                    )
                );

                CONNECTION_INFO1.connected = true;
                connectionReady1();
            });
        });
    }
};

peerConnection2.onicecandidate = function(e) {
    if (e.candidate === null) {
        CONNECTION_INFO2.offerAnswer = JSON.stringify(
            peerConnection2.localDescription
        );
    }

    var htmlStuff =
        "<input id='copyMe-2' type='text'> <button onclick='copyMyThingToClipboard2()'>Copy to clipboard</button>";
    if (CONNECTION_INFO2.connectionMode === "master") {
        htmlStuff =
            "Conection info generated.<br>Send this text to whoever is connecting and have them paste it into this page:<br>" +
            htmlStuff;
        htmlStuff += "<br><button id='sent-button-2'>Ok did it</button>";
    } else if (CONNECTION_INFO2.connectionMode === "slave") {
        htmlStuff =
            "Connection info processed.<br>Send this text back to whoever initiated the conection.<br>" +
            htmlStuff;
    }
    $("#setup-2").html(htmlStuff);
    $("#copyMe-2").val(CONNECTION_INFO2.offerAnswer);

    if (CONNECTION_INFO2.connectionMode === "master") {
        $("#sent-button-2").click(function() {
            var htmlStuff = "Paste their response here: ";
            htmlStuff +=
                "<input id='remote-val-2' type='text'> <button id='ok-button-2'>Ok</button>";
            $("#setup-2").html(htmlStuff);

            $("#ok-button-2").click(function() {
                peerConnection2.setRemoteDescription(
                    new RTCSessionDescription(
                        JSON.parse($("#remote-val-2").val())
                    )
                );

                CONNECTION_INFO2.connected = true;
                connectionReady2();
            });
        });
    }
};

peerConnection1.ondatachannel = function(e) {
    var dc = e.channel || e;
    if (dc.label === "pokedex-data") {
        dataChannel1 = dc;
        dataChannelCallbacks(dataChannel1, CONNECTION_INFO1);
    }

    CONNECTION_INFO1.connected = true;
    connectionReady1();
};

peerConnection2.ondatachannel = function(e) {
    var dc = e.channel || e;
    if (dc.label === "pokedex-data") {
        dataChannel2 = dc;
        dataChannelCallbacks(dataChannel2, CONNECTION_INFO2);
    }

    CONNECTION_INFO2.connected = true;
    connectionReady2();
};

$(function() {
    $("#initiate-connection-1").click(function() {
        console.log("connection 1 in master mode");
        $("#initiate-connection-1").remove();
        $("#join-connection-1").remove();
        CONNECTION_INFO1.connectionMode = "master";
        dataChannel1 = peerConnection1.createDataChannel("pokedex-data", {
            reliable: true
        });
        dataChannelCallbacks(dataChannel1, CONNECTION_INFO1);
        peerConnection1.createOffer(
            function(desc) {
                peerConnection1.setLocalDescription(
                    desc,
                    function() {},
                    function() {}
                );
            },
            function() {},
            sdpConstraints
        );

        $("#setup-1").text("Waiting...");
    });

    $("#initiate-connection-2").click(function() {
        console.log("connection 2 in master mode");
        $("#initiate-connection-2").remove();
        $("#join-connection-2").remove();
        CONNECTION_INFO2.connectionMode = "master";
        dataChannel2 = peerConnection.createDataChannel("pokedex-data", {
            reliable: true
        });
        dataChannelCallbacks(dataChannel2, CONNECTION_INFO2);
        peerConnection2.createOffer(
            function(desc) {
                peerConnection2.setLocalDescription(
                    desc,
                    function() {},
                    function() {}
                );
            },
            function() {},
            sdpConstraints
        );

        $("#setup-2").text("Waiting...");
    });

    $("#join-connection-1").click(function() {
        console.log("connection 1 in slave mode");
        $("#initiate-connection-1").remove();
        $("#join-connection-1").remove();
        CONNECTION_INFO1.connectionMode = "slave";

        var htmlStuff =
            "Paste the connection info from whoever is initiating the connection here: ";
        htmlStuff +=
            "<input id='remote-val-1' type='text'> <button id='ok-button-1'>Ok</button>";
        $("#setup-1").html(htmlStuff);
        $("#ok-button-1").click(function() {
            peerConnection1.setRemoteDescription(
                new RTCSessionDescription(JSON.parse($("#remote-val-1").val()))
            );
            peerConnection1.createAnswer(
                function(answerDesc) {
                    peerConnection1.setLocalDescription(answerDesc);
                },
                function() {},
                sdpConstraints
            );

            $("#setup-1").text("setting up...");
        });
    });

    $("#join-connection-2").click(function() {
        console.log("connection 2 in slave mode");
        $("#initiate-connection-2").remove();
        $("#join-connection-2").remove();
        CONNECTION_INFO2.connectionMode = "slave";

        var htmlStuff =
            "Paste the connection info from whoever is initiating the connection here: ";
        htmlStuff +=
            "<input id='remote-val-2' type='text'> <button id='ok-button-2'>Ok</button>";
        $("#setup-2").html(htmlStuff);
        $("#ok-button-2").click(function() {
            peerConnection2.setRemoteDescription(
                new RTCSessionDescription(JSON.parse($("#remote-val-2").val()))
            );
            peerConnection2.createAnswer(
                function(answerDesc) {
                    peerConnection2.setLocalDescription(answerDesc);
                },
                function() {},
                sdpConstraints
            );

            $("#setup-2").text("setting up...");
        });
    });
});

function dataChannelCallbacks(dc, info) {
    dc.onopen = function(e) {};
    dc.onmessage = function(e) {
        info.lastMessageTime = $.now();
        if (!info.connected) {
            // the connection is back apparently
            goodConnection(info);
        }
        if (e.data.size) {
            console.log("theres a size?");
        } else {
            if (e.data.charCodeAt(0) === 2) {
                console.log("2 thing, idk what this means");
                return;
            }
            var data = JSON.parse(e.data);
            if (data.type === "sync") {
                syncHandler(data.data);
            }
            if (data.type === "poke-event") {
                receivedPokeEvent(data["event-data"]);
            }
            if (data.type === "clearBoard") {
                clearBoard();
            }
        }
    };
}

function connectionReady1() {
    $("#setup-1").hide();

    if (isConnected()) {
        finalizeSetup();
    }

    goodConnection(CONNECTION_INFO1);
    CONNECTION_INFO1.lastMessageTime = $.now();
    CONNECTION_INFO1.heartbeat = window.setInterval(heartbeat, 1000);
}

function connectionReady2() {
    $("#setup-2").hide();

    if (isConnected()) {
        finalizeSetup();
    }

    goodConnection(CONNECTION_INFO2);
    CONNECTION_INFO2.lastMessageTime = $.now();
    CONNECTION_INFO2.heartbeat = window.setInterval(heartbeat, 1000);
}

function finalizeSetup() {
    $("#instructions").hide();
    $("#start-settings").hide();

    $("#board").show();
    // disable context menu on right click on the board
    $("#board").on("contextmenu", function(e) {
        e.preventDefault();
        return false;
    });

    makeBoard();
}

function heartbeat() {
    try {
        sendHeartbeat();
    } catch (e) {}

    // if (CONNECTION_INFO1.connected) {
    //     if (
    //         $.now() - CONNECTION_INFO1.lastMessageTime >
    //         CONNECTION_DEAD_AFTER
    //     ) {
    //         badConnection(CONNECTION_INFO1);
    //     }
    // }

    // if (CONNECTION_INFO2.connected) {
    //     if (
    //         $.now() - CONNECTION_INFO2.lastMessageTime >
    //         CONNECTION_DEAD_AFTER
    //     ) {
    //         badConnection(CONNECTION_INFO2);
    //     }
    // }

    if (CONNECTION_INFO1.connectionMode === "master") {
        boardSync(dataChannel1);
    }
    if (CONNECTION_INFO2.connectionMode === "master") {
        boardSync(dataChannel2);
    }
}

function sendHeartbeat() {
    if (!isConnected()) {
        console.log("Not connected!");
        return false;
    }
    send({ type: "heartbeat" });
}

function sendMessage(type, data) {
    if (!isConnected()) {
        console.log("Not connected!");
        return false;
    }
    send({ type: type, data: data });
}

function sendMessageTo(type, data, channel) {
    if (!isConnected()) {
        console.log("Not connected!");
        return false;
    }
    var serialized = JSON.stringify({ type: type, data: data });
    channel.send(serialized);
}

function sendEvent(eventData) {
    if (!isConnected()) {
        console.log("Not connected!");
        return;
    }
    send({ type: "poke-event", "event-data": eventData });
}

function copyMyThingToClipboard1() {
    $("#copyMe-1").select();
    document.execCommand("copy");
}

function copyMyThingToClipboard2() {
    $("#copyMe-2").select();
    document.execCommand("copy");
}

function isConnected() {
    return CONNECTION_INFO1.connected && CONNECTION_INFO2.connected;
}

function send(data) {
    var serialized = JSON.stringify(data);
    if (dataChannel1) {
        dataChannel1.send(serialized);
    }
    if (dataChannel2) {
        dataChannel2.send(serialized);
    }
}
