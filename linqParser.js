/**
 * Parses a LinqQuery and returns a function which will transform an array based on the Linq query
 * Uses a dynamic linq-like syntax
 * @method LinqQuery
 * @param  {string}  userQuery The query to parse - should be a string with dynamic linq like syntax
 * @example
 *  var query = LinqQuery("select(new (name, age)).orderby(age)");
 *  var items = [{name: "Joe", age: 5}, {name: "Phillip", age: 45, height: 123}, {name: "Sam", age: 12}];
 *  var results = query(items); // [{name: "Joe", age: 5}, {name: "Sam", age: 12}, {name: "Phillip", age: 45}]
 */
function LinqQuery(userQuery) {

}