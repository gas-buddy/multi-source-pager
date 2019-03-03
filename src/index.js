import * as vlq from 'vlq';

const empty = [];

function markResults({ results, hasMore }, sourceIndex) {
  if (!results || results.length === 0) {
    return null;
  }
  return (results || empty).map((result, index) => ({
    result,
    index,
    sourceIndex,
    hasMore,
  }));
}

function doSearch(source, sourcePosition, ix, query, limit) {
  if (sourcePosition === 0) {
    // The special value "0" does not mean offset 0, it means we exhausted the results of this source
    return empty;
  }
  return Promise
    .resolve(source.search(query, sourcePosition ? (sourcePosition - 1) : 0, limit))
    .then(r => markResults(r, ix));
}

// Figure out if there are more results from this data set
function hasMoreResults(results, originalPosition, resultsTaken) {
  if (resultsTaken) {
    if (results[resultsTaken] || results[0].hasMore) {
      return true;
    }
  }
  return false;
}

export default class MultiSourcePager {
  constructor(sources) {
    this.sources = sources;
  }

  async search(query, comparator, { limit, cursor }) {
    const [sourceLength, ...sourcePositions] = cursor ? vlq.decode(cursor) : [this.sources.length];

    if (sourceLength !== this.sources.length) {
      throw new Error('Cursor is not from this search interface - lengths do not match');
    }

    const exeggcute = (source, ix) => doSearch(source, sourcePositions[ix], ix, query, limit);
    const allSourceResults = await Promise.all(this.sources.map(exeggcute));

    const resultsTakenFromSource = [sourceLength];
    const results = [];

    while (results.length < limit) {
      // Pick the top candidate from each result set, and sort that array
      const possibles = allSourceResults
        .map((sourceResult, ix) => sourceResult[resultsTakenFromSource[ix + 1] || 0])
        .filter(r => !!r);
      if (possibles.length === 0) {
        // No next page available
        return { results };
      }
      // Top of array is the one we add to our pile, and update the counts of results we've taken
      const [pick] = possibles.sort((a, b) => comparator(a.result, b.result));
      results.push(pick.result);
      resultsTakenFromSource[pick.sourceIndex + 1] = (resultsTakenFromSource[pick.sourceIndex + 1] || 0) + 1;
    }

    this.sources.forEach((s, ix) => {
      // To build the next cursor, we store the original offset for each source + however many results we took
      // In order to optimize searches, the position 0 does not mean "first result," it means "no more results."
      // So the true offset is cursor[sourceIndex] - 1
      if (sourcePositions[ix] === 0 || !hasMoreResults(allSourceResults[ix], sourcePositions[ix], resultsTakenFromSource[ix + 1])) {
        resultsTakenFromSource[ix + 1] = 0;
      } else {
        resultsTakenFromSource[ix + 1] = (sourcePositions[ix] || 1) + (resultsTakenFromSource[ix + 1] || 0);
      }
    });

    return {
      results,
      next: vlq.encode(resultsTakenFromSource),
    };
  }
}
