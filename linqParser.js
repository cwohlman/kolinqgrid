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
	if (!userQuery) return function (data) {return data;};

	// Now parse the query
	var query = [], // This is an array of query operations
		operation, // The current operation - will be added to the query stack at the end of the parseOperation method
		token, // a string containing the current token to process
		pos = 0,
		next = userQuery[pos]; // current index in userQuery

	parseOperation();
	
	while(parseDot()) {
		parseOperation();
	}

	// DEBUG HACK!
	window.query = query; return function (data) {return data;};

	// Functions
	function parseOperation() {
		// we are at start of string, or following the dot after the last operation
		parseIdentifier();

		if (!token) throw new Error("No operation");
		
		operation = {
			method: token,
			args: []
		}

		expectOpenParen();

		parseOperationArguments();

		expectCloseParen();

		query.push(operation);
	}
	// TODO: parseWhiteSpace

	function parseOperationArguments() {
		parseOperationArg();
		while(parseComma()) {	
			parseOperationArg();
		}
	}

	function parseOperationArg() {
		parseIdentifier();
		var source = token, name = token;
		parseWhiteSpace();
		if (parseAs()) {
			parseIdentifier();
			name = token;
		}
		operation.args.push({
			name: name,
			source: source
		});
	}

	function parseWhiteSpace() {
		token = "";
		// parse until we run out of identifier chars
		while (next && next.match(/\s/)) readNext();

		return;
	}

	function parseAs() {
		parseWhiteSpace();
		if (next.match(/[A-Za-z]/)) parseIdentifier();
		else return false;
		if (token.toLowerCase() != "as") throw new Error("Expected as");
		else return true;
	}

	function parseComma() {
		parseWhiteSpace();
		if (next == ",") {
			readNext();
			return true;
		}
		return false;
	}

	function parseDot() {
		parseWhiteSpace();
		if (next == ".") {
			readNext();
			return true;
		}
		return false;
	}

	function expectOpenParen() {
		parseWhiteSpace();
		if (next != "(") throw new Error("Open Paren Expected");
		readNext();
		return;
	}
	function expectCloseParen() {
		parseWhiteSpace();
		if (next != ")") throw new Error("Close Paren Expected");
		readNext();
		return;
	}

	function parseIdentifier() {
		parseWhiteSpace();
		token = "";
		// parse until we run out of identifier chars
		while (next && next.match(/[a-zA-Z]/)) readNext(); // TODO: a more permisive regex

		if (!token) throw new Error("Expected identifier");

		return;
	}

	function readNext() {
		token += next;
		pos++;
		next = userQuery[pos];
	}
}