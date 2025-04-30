const simpleSchema = {
  type: 'record',
  name: 'OscMsg',
  fields: [
    { name: 'from', type: 'string' },
    { name: 'freq', type: 'float' },
    { name: 'gain', type: 'float' }
  ]
};

module.exports = { simpleSchema };
