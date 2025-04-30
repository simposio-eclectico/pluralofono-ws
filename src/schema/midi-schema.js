const midiSchema = {
  type: "record",
  name: "MidiMessage",
  fields: [
    {
      name: "type",
      type: {
        type: "enum",
        name: "MessageType",
        symbols: [
          "NOTE_ON",
          "NOTE_OFF",
          "CONTROL_CHANGE",
          "PROGRAM_CHANGE",
          "PITCH_BEND",
        ],
      },
    },
    {
      name: "channel",
      type: "int",
      doc: "MIDI channel (0-15)",
      default: 0
    },
    {
      name: "data",
      type: {
        type: "record",
        name: "MessageData",
        fields: [
          {
            name: "note",
            type: "int",
            doc: "Note number (0-127)",
            default: -1,
          },
          {
            name: "velocity",
            type: "int",
            doc: "Velocity (0-127)",
            default: -1,
          },
          {
            name: "controller",
            type: "int",
            doc: "Controller number (0-127)",
            default: -1,
          },
          {
            name: "value",
            type: "int",
            doc: "Controller value (0-127) or pitch bend value",
            default: -1,
          },
          {
            name: "program",
            type: "int",
            doc: "Program number (0-127)",
            default: -1,
          },
        ],
      },
    },
  ],
};

module.exports = { midiSchema };
