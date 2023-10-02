const port = 3000,
	express = require("express"),
	app = express(),
	httpStatus = require("http-status-codes");

const path = require("path");

var dps = require('dbpedia-sparql-client').default;

// Server configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
//app.set("views", path.join(__dirname, "static_views"));
app.use(express.static("public"));
// middleware configuration
app.use(express.urlencoded({ extended: false }));

// other type of data?
// in this route, create one query for name, one for abstract and one for links
// send the results to a different results page
// you may wish to challenge yourself here and create two queries for links, one that selects persons and one that selects non-persons
// if so, you need to update the template so that it can handle this
app.get("/about/:r", (req, res) => {
	let resource = req.params.r;
	resource = clean_string(resource);
	// be sure to use the correct PREFIX (look at the URLs on the resource page https://dbpedia.org/page/Bruno_Latour, is it property or ontology?)
	let q1 = `PREFIX dbpedia: <http://dbpedia.org/resource/>
		PREFIX dbpedia-prop: <http://dbpedia.org/property/>
		PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
		SELECT ?o WHERE { ${resource} rdfs:label ?o.
		FILTER ( LANG ( ?o ) = 'en' )} LIMIT 1`;
	// your own query for abstract here, fetch one object if there are more than one
	let q2 = `
		PREFIX dbpedia: <http://dbpedia.org/resource/>
		PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
		SELECT ?o WHERE { ${resource} dbpedia-owl:abstract ?o.
		FILTER ( LANG ( ?o ) = 'en' )} LIMIT 1`;
	// your own query here, fetch one piece of data (LIMIT 1)
	let q3 = `
		PREFIX dbpedia: <http://dbpedia.org/resource/>
		PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
		SELECT ?o WHERE { ${resource} dbpedia-owl:birthDate ?o } LIMIT 1`;
	// your own query here, fetch a list of objects to display as links
	let q4 = `
		PREFIX dbpedia: <http://dbpedia.org/resource/>
		PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
		SELECT ?o WHERE { ${resource} dbpedia-owl:wikiPageWikiLink ?o } LIMIT 10`;
	// add a relevant heading for the query to headings
	let returned_main_data = {"name": "", "abstract": "", "otherData": ""};
	let returned_related_links = [];
	let other_data_label = "Birth date";
	let related_links_label = "Wikipagelinks";
	// call the function with the first query
	dbp_query_o(q1, dps)
		.then( data => {
			// the results of the query will be stored in data, then placed in returned_main_data
			returned_main_data.name = data;
			// call the function with the second query
			if (q2 != "") { return dbp_query_o(q2, dps); }
			else { returned_main_data.abstract = ""; }
		} ).then( data => {
			// the results of the query will be stored in data, then placed in returned_main_data
			returned_main_data.abstract = data;
			// call the function with the third query
			if (q3 != "") { return dbp_query_o(q3, dps); }
			else { returned_main_data.otherData = ""; }
		} ).then( data => {
			// the results of the query will be stored in data, then placed in returned_main_data
			returned_main_data.otherData = data;
			// call dbp_query with the fourth query here
			if (q4 != "") { return dbp_query_o(q4, dps); }
			else { returned_related_links = []; }
		} ).then( data => {
			// the results of the query will be stored in data, then placed in returned_related_links
			returned_related_links = data;
		} ).then( () => {
			// this block follows a block with no function call, hence there is no data to pick up
			// we now send the data to results_page.ejs, where we pick up the variables mainObject (an object), relatedObjects and headings (arrays)
			res.render("information_about", { mainObject: returned_main_data, relatedObjects: returned_related_links, otherDataLabel: other_data_label, relatedLinksLabel: related_links_label });
		} )
		.catch( err => {
			// handle an error here
			console.log(err);
		});
});

app.get("/", (req, res) => {
	res.render("about");
});

app.get("/concepts", (req, res) => {
	res.render("concepts");
});

app.get("/linked_data", (req, res) => {
	res.render("linked_data");
});

// only for objects
function dbp_query_o(q, dps, args) {
	return new Promise((resolve, reject) => {
		dps.client()
			.query(q)
			.timeout(15000)
			.asJson()
			.then(function(r) {
				triples = r.results.bindings;
				let data = [];
				for (let i in triples) {
					data.push(triples[i].o.value);
				}
				resolve(data);
			})
		.catch(function(err) {
			console.log("Error with query: " + q);
			console.log("Error message: " + err);
			return resolve(["error, see log (Unexpected token V in JSON at position 0 means that there is a query related error)"]);
		});
	});
}

// this function adds backslashes in front of special characters and then adds the namespace dbpedia
function clean_string(s) {
	s = s.replace("(", "\\(");
	s = s.replace(")", "\\)");
	s = s.replace("'", "\\'");
	s = s.replace(",", "\\,");
	s = "dbpedia:" + s;
	return s;
}

app.listen(port, () => {
  console.log(`The Express.js server has started and is listening
   on port number: ${port}`);
});
