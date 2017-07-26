var config = require('./config'); //require the config file where the db config is
var db: {
	user: 'root',
	password: 'password',
	server: 'localhost',
	database: 'db_name',
	port: 1433,
	options: {
		tdsVersion: '7_4' //for SQL Server 2012
	}
};

function ssp(request, table, primaryKey, columns, callback) {
	var where = filter(request, columns);
	var orderBy = order(request, columns);
	var limitBy = limit(request);

	var query = "SELECT COUNT(" + primaryKey + ") AS count FROM " + table;

	//bind params
	var params = [];
	for (var i in columns) {
		params.push({key: "search", value: "%" + request.search.value + "%"});
	}

	sql.connect(db, function(err) {
	  if (err) {
	    console.log("SQL Connection Error");
	    console.log("Error: " + err);
	  } else {
			var request = new sql.Request();

	    request.query(query, function(err, result) {
	      if (err) {
					console.log("ssp.count error: " + err);
	      } else {

	        var recordSet = result.recordsets[0];
					query = "SELECT COUNT(" + primaryKey + ") AS count FROM " + table + where;

					request.query(query, function(err, result) {
						if (err) {
							console.log("ssp.recordFiltered error: " + err);
						}

						var recordSet2 = result.recordsets[0];

						var recordsFiltered = parseInt(recordSet2[0].count);
						if ((recordsFiltered - parseInt(request.start)) < request.length) { //check if last page
							request.length = recordsFiltered - parseInt(request.start);
						}

						// query = "SELECT " + columns.join(', ') + " FROM " + table + where + orderBy + limitBy; //MYSQL
						if (orderBy.column == "") {
							orderBy.column = 1;
						}

						query = "SELECT * FROM (SELECT TOP " + request.length + " * FROM  (SELECT TOP " + (parseInt(request.start) + parseInt(request.length)) + " " + columns.join(', ') + " FROM " + table + where + " ORDER BY " + orderBy.column + " " + orderBy.columnOrder + ") AS SOD ORDER BY " + orderBy.column + " " + orderBy.invertColumnOrder + ") AS SOD2 ORDER BY " + orderBy.column + " " + orderBy.columnOrder;

						request.query(query, function(err, result) {
							if (err) {
								console.log("ssp error: " + err);
							} else {
								var datatableResult = {
									"draw": parseInt(request.draw),
									"recordsTotal": parseInt(recordSet[0].count),
									"recordsFiltered": recordsFiltered,
									data: recordSet3
								};

								callback(err, datatableResult);
							}
						});
					});
	      }
	    });
		}
	});
}

/*
* @param  request Data sent to server by DataTables
* @param  columns Column information array
*
* @return string SQL where clause
*/
function filter(request, columns) {
	var where = "";
	if (request.search.value != "" && request.search != null) {
		for (var i in columns) { //loop to columns to build the WHERE LIKE clause
			var column = columns[i];

			if (where == "") {
				where = " WHERE CONVERT(VARCHAR, " + column + ") LIKE @search";
			} else {
				where += " OR CONVERT(VARCHAR, " + column + ") LIKE @search";
			}
		}
	}

	return where;
}

function order(request, columns) {
	var columnIndex = request.order[0].column;
	var columnOrder = request.order[0].dir;

	var invertColumnOrder = "ASC";
	if (columnOrder == "ASC") {
		invertColumnOrder == "DESC";
	}

	var orderDetail = {
		column: request.columns[columnIndex].data,
		columnOrder: columnOrder,
		invertColumnOrder: invertColumnOrder
	};

	return orderDetail;
}

function limit(request) {
	var limit = "";

	if (request.start != null && request.length != -1) {
		limit = " LIMIT " + parseInt(request.start) + ", " + parseInt(request.length);
	}

	return limit;
}

function jsonToArray(datas) {
	var array = [];

	for (var i in datas) {
      var arrayObj = [];
      for (var j in datas[i]) {
        if (datas[i][j] == null) {
          datas[i][j] = "";
        }

        arrayObj.push(datas[i][j].toString());
      }

      array.push(arrayObj);
    }

    return array;
}

module.exports = ssp;
