(function (root) {
  const defaultSearch = (query, directory, limit = 8) => {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return [];
    return directory.filter(([name, domain]) => `${name} ${domain}`.toLocaleLowerCase().includes(needle)).slice(0, limit);
  };
  let provider = defaultSearch;
  const api = Object.freeze({
    search(query, directory, limit) { return provider(query, directory, limit); },
    setProvider(next) {
      if (typeof next !== 'function') throw new TypeError('Company suggestion provider must be a function');
      provider = next;
    },
    resetProvider() { provider = defaultSearch; }
  });
  if (root) root.FullyPreparedCompanyProvider = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
