/**
 * NodeRED Google SmartHome
 * Copyright (C) 2020 Claudio Chimera.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

module.exports = function(RED) {
    "use strict";

    const formats = require('../formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    class MediaNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client                         = config.client;
            this.clientConn                     = RED.nodes.getNode(this.client);
            this.topicOut                       = config.topic;
            this.device_type					= config.device_type;
            this.available_applications_file    = config.available_applications_file;
            this.available_channels_file        = config.available_channels_file;
            this.available_inputs_file          = config.available_inputs_file;
            this.command_only_input_selector    = config.command_only_input_selector;
            this.ordered_inputs                 = config.ordered_inputs;
            this.support_activity_state         = config.support_activity_state;
            this.support_playback_state         = config.support_playback_state;
            this.command_only_on_off            = config.command_only_on_off;
            this.query_only_on_off              = config.query_only_on_off;
            this.supported_commands             = config.supported_commands;
            this.volume_max_level               = config.volume_max_level;
            this.can_mute_and_unmute            = config.can_mute_and_unmute;
            this.volume_default_percentage      = config.volume_default_percentage;
            this.level_step_size                = config.level_step_size;
            this.command_only_volume            = config.command_only_volume;
            this.available_modes_file           = config.available_modes_file;
            this.command_only_modes             = config.command_only_modes;
            this.query_only_modes               = config.query_only_modes;
            this.available_toggles_file         = config.available_toggles_file;
            this.command_only_toggles           = config.command_only_toggles;
            this.query_only_toggles             = config.query_only_toggles;

            if (!this.clientConn) {
                this.error(RED._("media.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("media.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }
            this.states = this.clientConn.register(this, 'media', config.name, this);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name, me) {
            RED.log.debug("MediaNode(registerDevice) device_type " + me.device_type);
            let states = {
                online: true
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.' + me.device_type,
                    traits: me.getTraits(me.device_type),
                    name: {
                        defaultNames: ["Node-RED " + me.getDefaultName(me.device_type)],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-media-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'media'
                    }
                }
            };

            device.states = states;
            this.updateAttributesForTraits(me, device);
            this.updateStatesForTraits(me, device);

            RED.log.debug("MediaNode(updated): device = " + JSON.stringify(device));

            return device;
        }

        updateAttributesForTraits(me, device) {
            const traits = device.properties.traits;
            let attributes = device.properties.attributes;

            if (traits.includes("action.devices.traits.AppSelector")) {
                attributes['availableApplications'] = {};  // TODO read file
            }
            if (traits.includes("action.devices.traits.InputSelector")) {
                attributes['availableInputs'] = {};  // TODO read file
                attributes['commandOnlyInputSelector'] = me.command_only_input_selector;
                attributes['commanorderedInputsOnlyInputSelector'] = me.ordered_inputs;
            }
            if (traits.includes("action.devices.traits.MediaState")) {
                attributes['supportActivityState'] = me.support_activity_state;
                attributes['supportPlaybackState'] = me.support_playback_state;
            }
            if (traits.includes("action.devices.traits.OnOff")) {
                attributes['commandOnlyOnOff'] = me.command_only_on_off;
                attributes['queryOnlyOnOff'] = me.query_only_on_off;
            }
            if (traits.includes("action.devices.traits.TransportControl")) {
                attributes['transportControlSupportedCommands'] = me.supported_commands;
            }
            if (traits.includes("action.devices.traits.Volume")) {
                attributes['volumeMaxLevel'] = me.volume_max_level;
                attributes['volumeCanMuteAndUnmute'] = me.can_mute_and_unmute;
                attributes['volumeDefaultPercentage'] = me.volume_default_percentage;
                attributes['levelStepSize'] = me.level_step_size;
                attributes['commandOnlyVolume'] = me.command_only_volume;
            }
            if (traits.includes("action.devices.traits.Toggles")) {
                attributes['availableToggles'] = {}; // TODO read file
                attributes['commandOnlyToggles'] = me.command_only_toggles;
                attributes['queryOnlyToggles'] = me.query_only_toggles;
            }
            if (traits.includes("action.devices.traits.Modes")) {
                attributes['availableModes'] = {}; // TODO read file
                attributes['commandOnlyModes'] = me.command_only_modes;
                attributes['queryOnlyModes'] = me.query_only_modees;
            }
            if (traits.includes("action.devices.traits.Channel")) {
                attributes['availableChannels'] = {}; // TODO read file
            }
        }

        updateStatesForTraits(me, device) {
            const traits = device.properties.traits;
            let states = device.states;

            if (traits.includes("action.devices.traits.AppSelector")) {
                states['currentApplication'] = '';
            }
            if (traits.includes("action.devices.traits.InputSelector")) {
                states['currentInput'] = '';
            }
            if (traits.includes("action.devices.traits.MediaState")) {
                // INACTIVE STANDBY ACTIVE
                states['activityState'] = 'INACTIVE';
                // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
                states['playbackState'] = 'STOPPED';
            }
            if (traits.includes("action.devices.traits.OnOff")) {
                states['on'] = false;
            }
            // if (traits.includes("action.devices.traits.TransportControl")) {
            // }
            if (traits.includes("action.devices.traits.Volume")) {
                states['currentVolume'] = me.volume_default_percentage;
                states['isMuted'] = false;
            }
            if (traits.includes("action.devices.traits.Toggles")) {
                states['currentToggleSettings'] = {}; // TODO Key/value pair with the toggle name of the device as the key, and the current state as the value.
            }
            if (traits.includes("action.devices.traits.Modes")) {
                states['currentModeSettings'] = {}; // TODO Key/value pair with the mode name of the device as the key, and the current setting_name as the value.
            }
            // if (traits.includes("action.devices.traits.Channel")) {
            // }
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("MediaNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("MediaNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("MediaNode(input): topic = " + topic);
            try {
                if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("MediaNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("MediaNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("MediaNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let online = this.states.online;

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (this.states.online !== online){
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        }

        onClose(removed, done) {
            if (removed) {
                // this node has been deleted
                this.clientConn.remove(this, 'media');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'media');
            }

            done();
        }

        getDefaultName(device_type) {
            switch(device_type) {
                case 'AUDIO_VIDEO_RECEIVER':
                    return "Audio-Video Receiver";
                case 'REMOTECONTROL':
                    return "Media Remote";
                case 'SETTOP':
                    return "Set-top Box";
                case 'SOUNDBAR':
                    return "Soundbar";
                case 'SPEAKER':
                    return "Speaker";
                case 'STREAMING_BOX':
                    return "Streaming Box";
                case 'STREAMING_SOUNDBAR':
                    return "Streaming Soundbar";
                case 'STREAMING_STICK':
                    return "Streaming Stick";
                case 'TV':
                    return "Television";
            }
            return '';
        }

        getTraits(device_type) {
            let traits=[
                "action.devices.traits.AppSelector",
                "action.devices.traits.InputSelector",
                "action.devices.traits.MediaState",
                "action.devices.traits.OnOff",
                "action.devices.traits.TransportControl",
                "action.devices.traits.Volume"
            ];

            if ((device_type === "REMOTECONTROL") || 
                (device_type === "SETTOP") ||
                (device_type === "TV")) {
                    traits.push("action.devices.traits.Channel");
            }
            if ((device_type === "REMOTECONTROL") || 
                (device_type === "TV")) {
                    traits.push("action.devices.traits.Modes");
                    traits.push("action.devices.traits.Toggles");
            }
            return traits;
        }

        execCommand(device, command) {
            let me = this;

            RED.log.debug("MediaNode:execCommand(command) " +  JSON.stringify(command));

            if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.GetMediaStream') {
                const params = command.params;
                if (params.hasOwnProperty('SupportedStreamProtocols')) {
                    const supported_protocols = params['SupportedStreamProtocols'];
                    let protocol = '';
                    let stramUrl = '';
                    supported_protocols.forEach(function (supported_protocol) {
                        let url = '';
                        if (url) {
                            protocol = supported_protocol;
                            stramUrl = url;
                        }
                    });
                    if (protocol.length > 0) {
                        let executionStates = ['online', 'mediaStreamAccessUrl', 'mediaStreamReceiverAppId', 'mediaStreamProtocol'];
                        if (me.authToken.length > 0) {
                            executionStates.push('mediaStreamAuthToken');
                        }
                        return {
                            status: 'SUCCESS',
                            states: {
                                online: true,
                                mediaStreamAccessUrl: stramUrl,
                                mediaStreamReceiverAppId: device.id, // App ID ??
                                mediaStreamAuthToken: me.authToken,
                                mediaStreamProtocol: protocol
                            },
                            executionStates: executionStates,
                        };
                    }
                }
            }
        }
    }

    RED.nodes.registerType("google-media", MediaNode);
}
