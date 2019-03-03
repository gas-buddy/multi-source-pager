import tap from 'tap';
import MultiSourcePager from '../src';

const DumbPager = array => ({
  search(query, offset, limit) {
    return { results: array.slice(offset, offset + limit) };
  },
});

const mapper = s => ({ value: s });
const comparator = (a, b) => (a.value - b.value);

tap.test('Read from static data source', async (t) => {
  const source1 = DumbPager([1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map(mapper));
  const source2 = DumbPager([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(mapper));

  t.strictEquals(source1.search({}, 1, 2).results.length, 2, 'DumbPager should return right length');
  t.strictEquals(source1.search({}, 1, 2).results[0].value, 3, 'DumbPager should return right element');
  t.strictEquals(source1.search({}, 1, 2).results[1].value, 5, 'DumbPager should return right element');

  const searcher = new MultiSourcePager([source1, source2]);

  const firstPage = await searcher.search({}, comparator, { limit: 7 });
  t.strictEquals(firstPage.results.length, 7, 'Should get 7 results back');
  t.ok(firstPage.next, 'First page should have a next page');
  t.strictSame(firstPage.results.map(s => s.value), [1, 2, 3, 4, 5, 6, 7], 'Should get the right first page');

  const secondPage = await searcher.search({}, comparator, { limit: 7, cursor: firstPage.next });
  t.strictEquals(secondPage.results.length, 7, 'Should get 7 results back');
  t.ok(secondPage.next, 'Second page should have a next page');
  t.strictSame(secondPage.results.map(s => s.value), [8, 9, 10, 11, 12, 13, 14], 'Should get the right second page');

  const thirdPage = await searcher.search({}, comparator, { limit: 7, cursor: secondPage.next });
  t.strictEquals(thirdPage.results.length, 6, 'Should get 6 results back');
  t.notOk(thirdPage.next, 'Third page should not have a next page');
  t.strictSame(thirdPage.results.map(s => s.value), [15, 16, 17, 18, 19, 20], 'Should get the right last page');
});

tap.test('Search only sources with more data', async (t) => {
  const source3 = DumbPager([1, 3, 4, 5, 6].map(mapper));
  const source4 = DumbPager([2].map(mapper));

  const splitSearcher = new MultiSourcePager([source3, source4]);
  const firstPage = await splitSearcher.search({}, comparator, { limit: 5 });
  t.strictEquals(firstPage.results.length, 5, 'Should get 5 results back');
  t.ok(firstPage.next, 'First page should have a next page');
  t.strictSame(firstPage.results.map(s => s.value), [1, 2, 3, 4, 5], 'Should get the right first page');

  const secondPage = await splitSearcher.search({}, comparator, { limit: 5, cursor: firstPage.next });
  t.strictEquals(secondPage.results.length, 1, 'Should get 1 result back');
  t.notOk(secondPage.next, 'Second page should not have a next page');
  t.strictSame(secondPage.results.map(s => s.value), [6], 'Should get the right second page');
});
