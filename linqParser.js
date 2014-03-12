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
		expression,
		next = userQuery[pos],
		identifierRegex = /[A-Za-z_]/; // current index in userQuery

	parseOperation();
	
	while(parseDot()) {
		parseOperation();
	}

	return function (data) {
		var result = data;
		query.forEach(function (a) {
			var method = LinqQuery[a.method.toLowerCase()];
			if (typeof method != "function") throw new Error("Unrecognized method: " + a.method.toLowerCase());
			result = method(result, a.args);
		});
		// Hack to make grouped items readable
		if (result && result[0] instanceof Array && result[0].key) result = result.map(function (a) {
			return a.key;
		});
		return result;
	};
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

		if (!parseCloseParen()) {
			parseOperationArguments();

			expectCloseParen();
		}

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
		parseExpression();
		var source = token, name = token;
		parseWhiteSpace();
		if (parseAs()) {
			parseIdentifier();
			name = token;
		}
		name = name.replace(".", "_");
		operation.args.push({
			name: name,
			source: source,
			expression: expression
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
		if (next.match(identifierRegex)) parseIdentifier();
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
	function parseOpenParen() {
		parseWhiteSpace();
		if (next == "(") {
			readNext();
			return true;
		}
		return false;
	}
	function parseCloseParen() {
		parseWhiteSpace();
		if (next == ")") {
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

	function parseExpression () {
		parseIdentifier();
		var result = token,
			outerToken = token,
			innerExpression;
		if (parseDot()) {
			result += ".";
			parseExpression()
			result += token;
			innerExpression = expression;
			expression = function (a) {
				return innerExpression(a && a[outerToken]);
			}
		} else if (parseOpenParen()) {
			result += "(";
			if (!parseCloseParen()) { 
				parseExpression() // we only parse the inner expression so we know when we're out of it.
				result += token;
				expectCloseParen();
			}
			result += ")";
			expression = LinqQuery(result);
		} else {
			expression = function (a) {
				return a && a[outerToken];
			};
		}
		token = result;
	}

	function parseIdentifier() {
		parseWhiteSpace();
		token = "";
		// parse until we run out of identifier chars
		while (next && next.match(identifierRegex)) readNext(); // TODO: a more permisive regex

		if (!token) throw new Error("Expected identifier");

		return;
	}

	function readNext() {
		token += next;
		pos++;
		next = userQuery[pos];
	}
}

LinqQuery.getProperty = function (instance, propertyPath) {
	var pathParts = propertyPath.split(".");
	if (pathParts.length == 0) throw new Error("No property path specified");
	pathParts.forEach(function (a) {
		instance = instance && instance[a];
	});
	return instance;
}

LinqQuery.select = function (data, args) {
	return data.map(function (a) {
		var result = {};
		args.forEach(function (arg) {
			result[arg.name] = arg.expression(a);
		});
		return result;
	});
}

LinqQuery.orderby = function (data, args) {
	return data.sort(function (a, b) {
		for (var i = 0; i < args.length; i++) {
			var expression = args[i].expression;
			if (expression(a) > expression(b)) return 1;
			if (expression(b) > expression(a)) return -1;
		};
		return 0;
	});
}

LinqQuery.groupby = function (data, args) {
	var groupings = {},
		result = [];
	data.forEach(function (a) {
		var key = {};
		args.forEach(function (arg) {
			key[arg.name] = arg.expression(a);
		});
		key = JSON.stringify(key); // Not necessarily the most performant way to do this
		groupings[key] = groupings[key] || [];
		groupings[key].push(a);
	});
	for (var prop in groupings) {
		groupings[prop].key = JSON.parse(prop);
		result.push(groupings[prop]);
	}
	return result;
}

LinqQuery.sum = function (data, args) {
	var sum = 0;
	data.forEach(function (a) {
		var val = args[0].expression(a);
		sum += val;
	});
	return sum;
}

LinqQuery.average = function (data, args) {
	return LinqQuery.sum(data, args) / LinqQuery.count(data, []);
}

LinqQuery.where = function (data, args) {
	return data.filter(args[0].expression);
}

LinqQuery.count = function (data, args) {
	if (!args.length) return data.length;
	else return LinqQuery.where(data, args).length;
}