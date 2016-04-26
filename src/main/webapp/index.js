var app = angular.module('qppModule', ['ngRoute', 'controllers','ngSanitize', 'ui.bootstrap']);
/* sessionTimeoutInterceptor will intercept default login page generated by spring 
 * and redirects to '/login' page of AngularJS.
 */ 
app.factory("sessionTimeoutInterceptor", ["$q", "$window", "$log",
  function ($q, $window, $log) {
    return {
     "response": function (response) {
        var responseHeaders;
        responseHeaders = response.headers();
        
        if (responseHeaders
        	&& responseHeaders["content-type"]
        	&& responseHeaders["content-type"].indexOf("text/html") !== -1 
        	&& response.data
        	&& response.data.indexOf('<h3>Login with Username and Password</h3>') !== -1) {
        	/* Spring generated login page contains '<h3>Login with Username and Password</h3>', so if response data
        	 * contains the above <h3> message, redirect to '/login' of AngularJS. 
        	 */
        		var urlParts = document.location.href.split("/");
            	window.location = "/" + urlParts[3] + "/#/login";
            	alert('login invoked');
        }
        
        return response;
      }
    };
 }
])

function qppRouteConfig($routeProvider, $httpProvider) {

    $routeProvider.
	    when('/start', {
			controller: 'StartController',
			templateUrl: 'start/start.html'
		}).
    	when('/manageProfile', {
    		controller: 'ProfileController',
    		templateUrl: 'manageProfile/manageProfile.html'
    	}).
    	when('/login', {
        	controller: 'LoginController',
        	templateUrl: 'login/login.html'
        }).
    	when('/dataImport', {
        	controller: 'DataImportController',
        	templateUrl: 'dataImport/dataImport.html'
        }).
    	when('/', {
            controller: 'HomeController',
            templateUrl: 'home/home.html'
        }).
        otherwise({
            redirectTo: '/'
        });
    
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    $httpProvider.interceptors.push('sessionTimeoutInterceptor');
    //$httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    //$httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
}

app.config(qppRouteConfig);

var controllers = angular.module('controllers', ['checklist-model']);

controllers.controller('HomeController', ['$rootScope', '$scope', '$http', '$location', '$route', '$anchorScroll',
    function ($rootScope, $scope, $http, $location, $route, $anchorScroll) {
		$anchorScroll();
     }]);

controllers.controller('LoginController', ['$rootScope','$scope', '$http', '$location',
                                           function ($rootScope, $scope, $http, $location) {
	$scope.credentials = {};
	$scope.error = [{show:false}, {message:''}];
	$rootScope.authenticated = false;
	$scope.login = function() {		
		$http({
			method: 'POST',
			url: 'qpplogin',
			data: $scope.credentials
		}).then(function(response){
			if(''==response.data) {
				$scope.error.show = true;
				$scope.error.message = 'There was a problem logging in. Please try again.';
			} else {
				$rootScope.authenticated = true;
				$rootScope.qppsessionid = response.data.sessionId;
				if($rootScope.nav == "manageProfile") {
					 $location.path("/manageProfile");
					 var urlParts = document.location.href.split("/");
			     	 window.location = "/" + urlParts[3] + "/#/manageProfile";
				} else if($rootScope.nav == "dataImport") {
					 $location.path("/dataImport");
					 var urlParts = document.location.href.split("/");
			     	 window.location = "/" + urlParts[3] + "/#/dataImport";					
				}
			}
		});
	};
 }]);

controllers.controller('ProfileController', ['$rootScope','$scope', '$http', '$location',
                                           function ($rootScope, $scope, $http, $location) {
	
	//Initial state of Navigation Bar
	$("#navtab1").addClass("active");
	$("#navtab2").addClass("disabled");
	$("#navtab3").addClass("disabled");
	$("#navtab4").addClass("disabled");
	
	//Message vars
	$scope.error = [{show:false}, {message:''}];
	$scope.success = [{show:false}, {message:''}];

	//Collection vars
	$scope.collections = [];
	$scope.selectCollectionModel = {currentCollection:null};
	$scope.assetNamesInData;
	$scope.assetNamesInExcel;
	$scope.currentDataCollectionId = null;
	$scope.currentExcelCollectionId = null;
	//$scope.assetsInDataCollection = [];
	//$scope.assetsInExcelCollection = [];
	$scope.selectAssetModel = [{currentDataAsset:null},{currentExcelAsset:null}];
	
	//Profile vars
	$scope.profiles = [];
	$scope.selectProfileModel = {currentProfile:null};
	
	$scope.delimiters = [{name:'Tab',value:'\t'}, {name:'Comma',value:','}, {name:'Semicolon',value:';'}, {name:'Space',value:' '}, {name:'Other',value:null}];
	$scope.selectDelimiterModel = {delimiter:null};
	$scope.selectDelimiterModel.delimiter = $scope.delimiters[1];
	
	$scope.tabZeroDisabled=true;
	$scope.tabs = [
	               { title:'Basic Information', active:true, disabled:false},
	               { title:'Data File Information', active:false, disabled:true},
	               { title:'Excel Information', active:false, disabled:true},
	               { title:'Data Mapping Information', active:false, disabled:true}
	             ];
	$scope.mp = {disablePrevious:false};
	$scope.showProfileBasic=false;
	
	$scope.showOther = false;
	
	$scope.textQualifiers = [{name:'"'},{name:"'"},{name:'NONE'}];
	$scope.selectTextQualifierModel = {currentTextQualifier:null};
	$scope.dataFileLevel = {value:null};
	
	$scope.headers = [];
	$scope.selectHeaderModel = {currentHeader:null};
	$scope.fund = {fundId:null};
	
	$scope.dataHeader = {value:null};
	
	$scope.worksheets = [];
	$scope.selectWorksheetModel = {currentWorksheet:null};
	$scope.definedNames = [];
	$scope.selectDefinedNameModel = {currentDefinedName:null};
	$scope.selectOrientationModel = {currentOrientation:null};
	
	$scope.mappingBlocks = [];
	$scope.selectFirstMappingBlockModel = {dataSource:null, cells:null};
	$scope.selectMappingBlockModel = [{dataSource:null, cells:null}];
	$scope.excelCells = [];
	$scope.cell = null;
	
	$scope.manageProfileLogic = function() {		
		//REST CALLS
		// 1 Fetch collections REST call (TRIGGER ON PAGE LOAD)
		$http.get('collections?qppsessionid='+$rootScope.qppsessionid)
			.then(function (response) {
				$scope.collections = response.data;
				var status = response.status;
				if('200'!=status) {
					$scope.error.show = true;
					$scope.error.message = 'Unable to fetch collections';
				}
			});
		
		// 2 Fetch files REST call
		$scope.findCollectionId = function () {
			// Clear old data
			$scope.clearVariables();
			
			$scope.fetchDataCollectionId('Data/Profiles');
			$scope.fetchExcelCollectionId('ExcelFiles/Templates');
		};
		
		// 2.1 Fetch Data files REST call
		$scope.fetchDataCollectionId = function(collectionName) {
			$scope.currentDataCollectionId = null;
			$scope.currentExcelCollectionId = null;
			
			var collectionPath = collectionName.split("/");
			$scope.tmpdata = {collectionId:null, assetsInCollection:[], assets:[]};
			
			//This loop finds parent folder
			for (var int = 0; int < $scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo.length; int++) {
				if($scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo[int].name == collectionPath[0]) {	
					var dataFolder = $scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo[int];
					//This loop finds Profiles or Templates folder
					for (var int1 = 0; int1 < dataFolder.collectionInfoList.collectionInfo.length; int1++) {
						if(dataFolder.collectionInfoList.collectionInfo[int1].name == collectionPath[1]) {			
							$scope.tmpdata.collectionId = dataFolder.collectionInfoList.collectionInfo[int1].id;
							break;
						}
					}
				}
			}
			if($scope.tmpdata.collectionId == null) {
				$scope.error.show = true;
				$scope.error.message = collectionName+' folder not present in '+$scope.selectCollectionModel.currentCollection.name+' collection';
			} else {
				$scope.error = [{show:false}, {message:''}];
				
				$http.get('assetsInCollection?collectionId='+$scope.tmpdata.collectionId+'&qppsessionid='+$rootScope.qppsessionid)
					.then(function (response) {
						$scope.tmpdata.assetsInCollection = response.data;
						var status = response.status;
						if('200'!=status) {
							$scope.error.show = true;
							$scope.error.message = 'Unable to fetch collections';
						} else {
							// Get Asset Attribute Names
							var assets = [];
							var count = 0;
							if(0 == $scope.tmpdata.assetsInCollection.length) {
								if(true == $scope.error.show) {
									$scope.error.message = $scope.error.message + ' and in '+collectionName+' folder';
								} else {
									$scope.error.show = true;
									$scope.error.message = 'No Files present in '+collectionName+' folder';
								}
							}
							for (var int = 0; int < $scope.tmpdata.assetsInCollection.length; int++) {
								var attributes = $scope.tmpdata.assetsInCollection[int].attributeValueList.attributeValue;
								//$scope.assetNames[count].id = $scope.assetsInDataCollection[int].id;
								for (var int2 = 0; int2 < attributes.length; int2++) {
									if(attributes[int2].name == 'Name') {
										//$scope.assetNames[count].name = attributes[int2].value;
										$scope.tmpdata.assets.push({id:$scope.tmpdata.assetsInCollection[int].id, name:attributes[int2].value});
										count = count+1;
										break;
									}
								}
							}
							
							$scope.currentDataCollectionId = $scope.tmpdata.collectionId;
							//$scope.assetsInDataCollection = $scope.tmpdata.assetsInCollection;
							$scope.assetNamesInData = $scope.tmpdata.assets;
							//Fetch Profiles for selected collection/client
							$scope.fetchProfiles();
						}
					});
			}
		};
		
		// 2.2 Fetch Excel files REST call
		$scope.fetchExcelCollectionId = function(collectionName) {
			$scope.currentDataCollectionId = null;
			$scope.currentExcelCollectionId = null;
			
			var collectionPath = collectionName.split("/");
			$scope.tmpexcel = {collectionId:null, assetsInCollection:[], assets:[]};
			
			//This loop finds parent folder
			for (var int = 0; int < $scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo.length; int++) {
				if($scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo[int].name == collectionPath[0]) {	
					var dataFolder = $scope.selectCollectionModel.currentCollection.collectionInfoList.collectionInfo[int];
					//This loop finds Profiles or Templates folder
					for (var int1 = 0; int1 < dataFolder.collectionInfoList.collectionInfo.length; int1++) {
						if(dataFolder.collectionInfoList.collectionInfo[int1].name == collectionPath[1]) {			
							$scope.tmpexcel.collectionId = dataFolder.collectionInfoList.collectionInfo[int1].id;
							break;
						}
					}
				}
			}
			if($scope.tmpexcel.collectionId == null) {
				$scope.error.show = true;
				$scope.error.message = collectionName+' folder not present in '+$scope.selectCollectionModel.currentCollection.name+' collection';
			} else {
				$scope.error = [{show:false}, {message:''}];
				
				$http.get('assetsInCollection?collectionId='+$scope.tmpexcel.collectionId+'&qppsessionid='+$rootScope.qppsessionid)
					.then(function (response) {
						$scope.tmpexcel.assetsInCollection = response.data;
						var status = response.status;
						if('200'!=status) {
							$scope.error.show = true;
							$scope.error.message = 'Unable to fetch collections';
						} else {
							// Get Asset Attribute Names
							var assets = [];
							var count = 0;
							if(0 == $scope.tmpexcel.assetsInCollection.length) {
								if(true == $scope.error.show) {
									$scope.error.message = $scope.error.message + ' and in '+collectionName+' folder';
								} else {
									$scope.error.show = true;
									$scope.error.message = 'No Files present in '+collectionName+' folder';
								}
							}
							for (var int = 0; int < $scope.tmpexcel.assetsInCollection.length; int++) {
								var attributes = $scope.tmpexcel.assetsInCollection[int].attributeValueList.attributeValue;
								//$scope.assetNames[count].id = $scope.assetsInDataCollection[int].id;
								for (var int2 = 0; int2 < attributes.length; int2++) {
									if(attributes[int2].name == 'Name') {
										//$scope.assetNames[count].name = attributes[int2].value;
										$scope.tmpexcel.assets.push({id:$scope.tmpexcel.assetsInCollection[int].id, name:attributes[int2].value});
										count = count+1;
										break;
									}
								}
							}
							
							$scope.currentExcelCollectionId = $scope.tmpexcel.collectionId;
							//$scope.assetsInExcelCollection = $scope.tmpexcel.assetsInCollection;
							$scope.assetNamesInExcel = $scope.tmpexcel.assets;
						}
					});
			}
		};
		
		// 3 Fetch Profiles REST call
		$scope.fetchProfiles = function() {
			$http.get('profiles')
			.then(function(response) {
				var data = response.data;
				var status = response.status;
				if('200'!=status) {
					$scope.error.show = true;
					$scope.error.message = 'Unable to fetch profiles';
				} else {
					var tempProfiles = [];
					for (var int = 0; int < data.length; int++) {
						if($scope.selectCollectionModel.currentCollection.name == data[int].client) {
							tempProfiles.push(data[int]);
						}
					}
					$scope.profiles = tempProfiles;				
				}
			});
		};
		
		// 4 Fetch worksheets REST call
		$scope.fetchWorksheetsCallback = function(callback) {
			var parserData = new Object();
			parserData.assetId = $scope.selectAssetModel.currentExcelAsset.id;
			
			$http({
				method: 'POST',
				url: 'parseExcel?qppsessionid='+$rootScope.qppsessionid,
				data: parserData
			}).then(function(response){
				var status = response.status;
				if('200'!=status) {
					$scope.error.show = true;
					$scope.error.message = 'Unable to fetch Worksheet and Defined Names';
				} else {
					$scope.worksheets = response.data;
					callback && callback();
				}
			});
		};
		
		// 5 Fetch Headers REST call
		$scope.fetchHeaders = function() {
			var parserData = new Object();
			parserData.assetId = $scope.selectAssetModel.currentDataAsset.id;
			parserData.hasHeaders = $scope.dataHeader.value;
			parserData.separator = $scope.selectDelimiterModel.delimiter;
			parserData.txtQualifier = $scope.selectTextQualifierModel.currentTextQualifier.name;
			
			$http({
				method: 'POST',
				url: 'parseProfile?qppsessionid='+$rootScope.qppsessionid,
				data: parserData
			}).then(function(response){
				var status = response.status;
				if('200'!=status) {
					$scope.error.show = true;
					$scope.error.message = 'Unable to fetch Headers';
				} else {
					$scope.headers = response.data;	
				}
			});
		};
		
		$scope.fetchHeadersWhenLevelSelected = function() {
			if('global' == $scope.dataFileLevel.value) {
				$scope.fetchHeaders();
			} else if('fund' == $scope.dataFileLevel.value) {
				$scope.fetchHeaders();
			}
		};
		
		// 6 Fetch Worksheets when ExcelFile is selected
		$scope.fetchWorksheets = function() {
			if(null != $scope.selectAssetModel.currentExcelAsset) {			
				var parserData = new Object();
				parserData.assetId = $scope.selectAssetModel.currentExcelAsset.id;
				
				$http({
					method: 'POST',
					url: 'parseExcel?qppsessionid='+$rootScope.qppsessionid,
					data: parserData
				}).then(function(response){
					var status = response.status;
					if('200'!=status) {
						$scope.error.show = true;
						$scope.error.message = 'Unable to fetch Worksheet and Defined Names';
					} else {
						$scope.worksheets = response.data;
					}
				});
			}
		};
		
		// Other JS functions
		$scope.populateProfile = function(cProfile) {
			// Clear old data
			$scope.clearVariablesOnProfileChange();
			
			// cProfile is NULL for - Create New Profile - selection
			if(null != cProfile) {
				// Populate Form fields with selected Profile
				//$scope.selectProfileModel.currentProfile.id = $scope.profiles.id;
				//$scope.selectProfileModel.currentProfile.title = $scope.profiles.title;
				//$scope.selectProfileModel.currentProfile.description = $scope.profiles.description;
				
				if(null == $scope.selectCollectionModel.currentCollection) {
					$scope.error.show = true;
					$scope.error.message = "Collection must be selected before Profile selection";
					$scope.selectProfileModel.currentProfile = null;
					return;
				} else {
					$scope.error.show = false;
				}
				
				$scope.selectCollectionModel.currentCollection.name = cProfile.client;
				$scope.selectCollectionModel.currentCollection.id = cProfile.clientId;
				
				//Initialize currentDataAsset
				$scope.selectAssetModel.currentDataAsset = {name:null,id:null};
				$scope.selectAssetModel.currentDataAsset.name = cProfile.dataProfileFile;
				$scope.selectAssetModel.currentDataAsset.id = cProfile.dataProfileFileId;
				$scope.selectDelimiterModel.delimiter = cProfile.dataProfileDelimiter;
				
				if($scope.selectDelimiterModel.delimiter.name == 'Other') {
					$scope.delimiters[4] = $scope.selectDelimiterModel.delimiter;
					$scope.showOther = true;
				} else if($scope.selectDelimiterModel.delimiter.name == 'Tab') {
					$scope.delimiters[0] = $scope.selectDelimiterModel.delimiter;
				} else if($scope.selectDelimiterModel.delimiter.name == 'Comma') {
					$scope.delimiters[1] = $scope.selectDelimiterModel.delimiter;
				} else if($scope.selectDelimiterModel.delimiter.name == 'Semicolon') {
					$scope.delimiters[2] = $scope.selectDelimiterModel.delimiter;
				} else if($scope.selectDelimiterModel.delimiter.name == 'Space') {
					$scope.delimiters[3] = $scope.selectDelimiterModel.delimiter;
				}
				
				$scope.selectTextQualifierModel.currentTextQualifier.name = cProfile.dataProfileTextQualifier;
				$scope.dataHeader.value = cProfile.dataProfileHasHeaders;
				$scope.dataFileLevel.value = cProfile.dataProfileLevel;
				
				//Fetch FundId Locations!
				$scope.fetchHeaders();
				$scope.selectHeaderModel.currentHeader = cProfile.dataProfileFundIdLocation;
				$scope.fund.fundId = cProfile.dataProfileFundId;
				
				//Fetch Excel Template
				$scope.fetchExcelCollectionId('ExcelFiles/Templates');
				//Initialize currentExcelAsset
				$scope.selectAssetModel.currentExcelAsset = {name:null,id:null};
				$scope.selectAssetModel.currentExcelAsset.name = cProfile.excelTemplateFile;
				$scope.selectAssetModel.currentExcelAsset.id = cProfile.excelTemplateFileId;
				
				//Initialize currentWorksheet
				$scope.selectWorksheetModel.currentWorksheet = {name:null,rows:null,columns:null,definedNames:null};
				$scope.selectWorksheetModel.currentWorksheet.name = cProfile.excelWorksheet;

				//Fetch Worksheet
				$scope.fetchWorksheetsCallback(function() {
					
					$scope.selectHeaderModel.currentHeader = $scope.selectProfileModel.currentProfile.dataProfileFundIdLocation;
					$scope.selectDefinedNameModel.currentDefinedName.name = $scope.selectProfileModel.currentProfile.excelDefinedName;
					
					for (var int = 0; int < $scope.worksheets.length; int++) {
						if($scope.selectWorksheetModel.currentWorksheet.name == $scope.worksheets[int].name) {					
							$scope.definedNames = $scope.worksheets[int].definedNames;
							break;
						}
					}
					for (var int2 = 0; int2 < $scope.definedNames.length; int2++) {
						if($scope.selectDefinedNameModel.currentDefinedName.name == $scope.definedNames[int2].name) {
							$scope.showMappingBlock = true;
							$scope.selectDefinedNameModel.currentDefinedName.rows = $scope.definedNames[int2].rows;
							$scope.selectDefinedNameModel.currentDefinedName.columns = $scope.definedNames[int2].columns;
							break;
						}
					}
					//$scope.selectDefinedNameModel.currentDefinedName = {name:null};
					$scope.selectOrientationModel.currentOrientation = $scope.selectProfileModel.currentProfile.excelTableOrientation;
					$scope.selectMappingBlockModel =[];
					$scope.selectFirstMappingBlockModel=null;
					for (var int3 = 0; int3 < $scope.selectProfileModel.currentProfile.excelDataMapping.length; int3++) {
						if(0 == int3) {
							$scope.selectFirstMappingBlockModel = $scope.selectProfileModel.currentProfile.excelDataMapping[int3];					
						} else {				
							$scope.selectMappingBlockModel.push($scope.selectProfileModel.currentProfile.excelDataMapping[int3]);
							$scope.mappingBlocks.push($scope.selectProfileModel.currentProfile.excelDataMapping[int3]);
						}
					}
					
				});
				
				//Fetch Defined Range
				//$scope.fetchDefinedNames();
				//Initialize currentWorksheet
				$scope.selectDefinedNameModel.currentDefinedName = {name:null};
				/*$scope.selectDefinedNameModel.currentDefinedName.name = cProfile.excelDefinedName;
				$scope.selectOrientationModel.currentOrientation = cProfile.excelTableOrientation;
				$scope.selectMappingBlockModel =[];
				$scope.selectFirstMappingBlockModel=null;
				for (var int = 0; int < cProfile.excelDataMapping.length; int++) {
					if(0 == int) {
						$scope.selectFirstMappingBlockModel = cProfile.excelDataMapping[int];					
					} else {				
						$scope.selectMappingBlockModel.push(cProfile.excelDataMapping[int]);
						$scope.mappingBlocks.push(cProfile.excelDataMapping[int]);
					}
				}*/
			}
		};
		
		$scope.catchDuplicateCells = function() {
			var selectedCell = null;
			var count = 0;
			
			// First cell mapping
			selectedCell = $scope.selectFirstMappingBlockModel.cells;
	/*		if(selectedCell == $scope.selectFirstMappingBlockModel.cells) {
				count++;
			}*/
			for (var int = 0; int < $scope.selectMappingBlockModel.length; int++) {
				if(selectedCell == $scope.selectMappingBlockModel[int].cells) {
					$scope.error.show = true;
					$scope.error.message = "Duplicate "+$scope.cell+" '"+selectedCell+"' selected";
					// disable tabs
					$scope.mp.disablePrevious = true;
					return;
				}
			}
			
			// Rest of the cell mappings
			for (var int1 = 0; int1 < $scope.selectMappingBlockModel.length; int1++) {
				selectedCell = $scope.selectMappingBlockModel[int1].cells;
				if(selectedCell == $scope.selectFirstMappingBlockModel.cells) {
					count++;
				}
				for (var int = 0; int < $scope.selectMappingBlockModel.length; int++) {
					if(selectedCell == $scope.selectMappingBlockModel[int].cells) {
						count++;
					}
				}
				if(count > 1) {
					$scope.error.show = true;
					$scope.error.message = "Duplicate "+$scope.cell+" '"+selectedCell+"' selected";
					// disable tabs
					$scope.mp.disablePrevious = true;
					return;
				}
				count = 0;
			}
			$scope.error.show = false;
			// enable tabs
			$scope.mp.disablePrevious = false;
		};
		
		$scope.showOtherDelimiter = function(delimiter) {
			if(delimiter.name == "Other") {
				$scope.showOther = true;
			} else {
				$scope.showOther = false;
			}
			if(!(delimiter.name == "Other" && (delimiter.value == null || delimiter.value == ''))) {				
				$scope.fetchHeadersWhenLevelSelected();
			}
			//$scope.validateDelimiters();
		};
		
		/*$scope.validateDelimiters = function() {
			if($scope.selectDelimiterModel.delimiters.length == 0) {
				$scope.error.show = true;
				$scope.error.message = 'Please select at least one Delimiter';
				return;
			} else {
				$scope.error.show = false;
			}
		};*/
		
		// Fetch DefinedNames when Worksheet is selected
		$scope.fetchDefinedNames = function() {
			if(null == $scope.selectWorksheetModel.currentWorksheet) {
				//Initialize currentWorksheet
				$scope.selectWorksheetModel.currentWorksheet = {name:null,rows:null,columns:null,definedNames:null};
				$scope.selectWorksheetModel.currentWorksheet.name = $scope.selectProfileModel.currentProfile.excelWorksheet;
			}
			
			//if(null != $scope.selectWorksheetModel.currentWorksheet) {
				//alert('currentWorksheet is null');
				$scope.definedNames = $scope.selectWorksheetModel.currentWorksheet.definedNames;
			//}
		};
		
		// Mapping Block logic - Add
		$scope.addMappingBlock = function() {
			//var count = 0;
			$scope.showMappingBlock = true;
			var block = {dataSource: $scope.headers, column:'column'};
			$scope.mappingBlocks.push(block);
		};
		
		// Mapping Block logic - Close
		$scope.closeMappingBlock = function(index) {
			$scope.mappingBlocks.splice(index, 1);
			$scope.selectMappingBlockModel.splice(index,1);
			
			$scope.catchDuplicateCells();
		};
		
		// Validate & determine Orientation and switch to next tab
		$scope.validateOrientationAndTab = function(index) {
			if($scope.selectOrientationModel.currentOrientation == null) {
				$scope.error.show = true;
				$scope.error.message = 'Table Orientation is required';
			} else {
				if("HORIZONTAL" == $scope.selectOrientationModel.currentOrientation) {
					$scope.cell = 'Column';
					$scope.excelCells = $scope.selectDefinedNameModel.currentDefinedName.columns;
				} else {
					$scope.cell = 'Row';
					$scope.excelCells = $scope.selectDefinedNameModel.currentDefinedName.rows;
				}
				
				$scope.error.show = false;
				$scope.nextTab(index, true);
			}
		};
		
		$scope.nextTab = function(index, next) {
			switch (index) {
			case 1:
				$scope.showProfileBasic=true;
				
				//Navigation Bar status of second tab
				$("#navtab1").removeClass("active").addClass("complete");
				$("#navtab2").removeClass("disabled").removeClass("complete").addClass("active");
				$("#navtab3").removeClass("active").removeClass("complete").addClass("disabled");
				$("#navtab4").removeClass("active").removeClass("complete").addClass("disabled");
				
				$("#tabArea1").hide();
				if(next) {					
					$scope.slideEffect('tabArea2', 'right', 700);
				} else {
					$scope.slideEffect('tabArea2', 'left', 700);
				}
				$("#tabArea3").hide();
				$("#tabArea4").hide();
				break;

			case 2:
				$("#navtab4pbar").css("width","0%");
				//Navigation Bar status of third tab
				$("#navtab1").removeClass("active").addClass("complete");
				$("#navtab2").removeClass("active").addClass("complete");
				$("#navtab3").removeClass("disabled").removeClass("complete").addClass("active");
				$("#navtab4").removeClass("active").removeClass("complete").addClass("disabled");
				
				$("#tabArea1").hide();
				$("#tabArea2").hide();
				if(next) {
					$scope.slideEffect('tabArea3', 'right', 700);
				} else {
					$scope.slideEffect('tabArea3', 'left', 700);
				}
				$("#tabArea4").hide();
				break;
			
			case 3:
				//Navigation Bar status of fourth tab
				$("#navtab1").removeClass("active").addClass("complete");
				$("#navtab2").removeClass("active").addClass("complete");
				$("#navtab3").removeClass("active").addClass("complete");
				$("#navtab4").removeClass("disabled").addClass("active");
				
				$("#tabArea1").hide();
				$("#tabArea2").hide();
				$("#tabArea3").hide();
				$scope.slideEffect('tabArea4', 'right', 700);
				break;
				
			default:
				//Initial state of Navigation Bar
				$("#navtab1").removeClass("complete").addClass("active");			
				$("#navtab2").removeClass("active").removeClass("complete").addClass("disabled");
				$("#navtab3").removeClass("active").removeClass("complete").addClass("disabled");
				$("#navtab4").removeClass("active").removeClass("complete").addClass("disabled");
				
				$scope.slideEffect('tabArea1', 'left', 700);
				$("#tabArea2").hide();
				$("#tabArea3").hide();
				$("#tabArea4").hide();
				break;
			}
		};
		
		$scope.slideEffect = function(id, slideDirection, duration) {
		    // Set the effect type
			var effect = 'slide';
		    // Set the options for the effect type chosen
			var options = { direction: slideDirection };
		    $('#'+id).toggle(effect, options, duration);
		};
		
		// 7 Create Profile REST call
		$scope.submitProfile = function() {			
			//Final state of Navigation Bar
			$("#navtab4").removeClass("active").addClass("complete");
			$("#navtab4pbar").css("width","100%");
			
			// Build ManageProfile object to transfer Form data
			var manageProfileData = new Object();
			
			manageProfileData.id = $scope.selectProfileModel.currentProfile.id;
			manageProfileData.title = $scope.selectProfileModel.currentProfile.title;
			manageProfileData.description = $scope.selectProfileModel.currentProfile.description;
			manageProfileData.client = $scope.selectCollectionModel.currentCollection.name;
			manageProfileData.clientId = $scope.selectCollectionModel.currentCollection.id;
			
			manageProfileData.dataProfileFile = $scope.selectAssetModel.currentDataAsset.name;
			manageProfileData.dataProfileFileId = $scope.selectAssetModel.currentDataAsset.id;
			manageProfileData.dataProfileDelimiter = $scope.selectDelimiterModel.delimiter;
			manageProfileData.dataProfileTextQualifier = $scope.selectTextQualifierModel.currentTextQualifier.name;
			manageProfileData.dataProfileHasHeaders = $scope.dataHeader.value;
			manageProfileData.dataProfileLevel = $scope.dataFileLevel.value;
			manageProfileData.dataProfileFundIdLocation = $scope.selectHeaderModel.currentHeader;
			manageProfileData.dataProfileFundId = $scope.fund.fundId;
			
			manageProfileData.excelTemplateFile = $scope.selectAssetModel.currentExcelAsset.name;
			manageProfileData.excelTemplateFileId = $scope.selectAssetModel.currentExcelAsset.id;
			manageProfileData.excelWorksheet = $scope.selectWorksheetModel.currentWorksheet.name;
			manageProfileData.excelDefinedName = $scope.selectDefinedNameModel.currentDefinedName.name;
			manageProfileData.excelTableOrientation = $scope.selectOrientationModel.currentOrientation;
			
			manageProfileData.excelDataMapping = [];
			manageProfileData.excelDataMapping.push($scope.selectFirstMappingBlockModel);
			for (var int = 0; int < $scope.selectMappingBlockModel.length; int++) {
				manageProfileData.excelDataMapping.push($scope.selectMappingBlockModel[int]);
			}
			
			// REST call to /createProfile
			$http({
				method: 'POST',
				url: 'createProfile',
				data: manageProfileData
			}).then(function(response){
				var status = response.status;
				if('200'!=status) {
					$scope.error.show = true;
					$scope.error.message = 'Problem saving '+$scope.selectProfileModel.currentProfile.title+' profile!';
				} else {
					$scope.success.show = true;
					$scope.success.message = $scope.selectProfileModel.currentProfile.title+' profile saved successfully';
				}
			});
			
			
		};
		
		$scope.clearDataMapping = function() {
			$scope.mappingBlocks = [];
			$scope.selectFirstMappingBlockModel = {dataSource:null, cells:null};
			$scope.selectMappingBlockModel = [{dataSource:null, cells:null}];
			$scope.excelCells = [];
			$scope.cell = null;
		};
		
		$scope.clearWorksheetAndDefinedRange = function(callback) {
			$scope.worksheets = [];
			$scope.selectWorksheetModel = {currentWorksheet:null};
			$scope.definedNames = [];
			$scope.selectDefinedNameModel = {currentDefinedName:null};
			callback && callback();
		}
		
		$scope.clearVariables = function() {
			//$scope.selectCollectionModel = {currentCollection:null};
			$scope.assetNamesInData;
			$scope.assetNamesInExcel;
			$scope.currentDataCollectionId = null;
			$scope.currentExcelCollectionId = null;
			//$scope.assetsInDataCollection = [];
			//$scope.assetsInExcelCollection = [];
			$scope.selectAssetModel = [{currentDataAsset:null},{currentExcelAsset:null}];
			
			//Profile vars
			$scope.profiles = [];
			$scope.selectProfileModel = {currentProfile:null};
			
			$scope.delimiters = [{name:'Tab',value:'\t'}, {name:'Comma',value:','}, {name:'Semicolon',value:';'}, {name:'Space',value:' '}, {name:'Other',value:null}];
			$scope.selectDelimiterModel = {delimiter:null};
			$scope.selectDelimiterModel.delimiter = $scope.delimiters[1];
			
			/*$scope.tabZeroDisabled=true;
			$scope.tabs = [
			               { title:'Basic Information', active:true, disabled:false},
			               { title:'Data File Information', active:false, disabled:true},
			               { title:'Excel Information', active:false, disabled:true},
			               { title:'Data Mapping Information', active:false, disabled:true}
			             ];*/
			$scope.mp = {disablePrevious:false};
			$scope.showProfileBasic=false;
			
			$scope.showOther = false;
			
			$scope.textQualifiers = [{name:'"'},{name:"'"},{name:'NONE'}];
			//$scope.selectTextQualifierModel = {currentTextQualifier:null};
			$scope.dataFileLevel = {value:null};
			
			$scope.headers = [];
			$scope.selectHeaderModel = {currentHeader:null};
			$scope.fund = {fundId:null};
			
			$scope.dataHeader = {value:null};
			
			$scope.worksheets = [];
			$scope.selectWorksheetModel = {currentWorksheet:null};
			$scope.definedNames = [];
			$scope.selectDefinedNameModel = {currentDefinedName:null};
			$scope.selectOrientationModel = {currentOrientation:null};
			
			$scope.mappingBlocks = [];
			$scope.selectFirstMappingBlockModel = {dataSource:null, cells:null};
			$scope.selectMappingBlockModel = [{dataSource:null, cells:null}];
			$scope.excelCells = [];
			$scope.cell = null;
		};
		
		$scope.clearVariablesOnProfileChange = function() {
			//$scope.selectCollectionModel = {currentCollection:null};
			$scope.assetNamesInData;
			$scope.assetNamesInExcel;
			$scope.currentDataCollectionId = null;
			$scope.currentExcelCollectionId = null;
			//$scope.assetsInDataCollection = [];
			//$scope.assetsInExcelCollection = [];
			$scope.selectAssetModel = [{currentDataAsset:null},{currentExcelAsset:null}];
			
			//Profile vars
			//$scope.profiles = [];
			//$scope.selectProfileModel = {currentProfile:null};
			
			$scope.delimiters = [{name:'Tab',value:'\t'}, {name:'Comma',value:','}, {name:'Semicolon',value:';'}, {name:'Space',value:' '}, {name:'Other',value:null}];
			$scope.selectDelimiterModel = {delimiter:null};
			$scope.selectDelimiterModel.delimiter = $scope.delimiters[1];
			
			/*$scope.tabZeroDisabled=true;
			$scope.tabs = [
			               { title:'Basic Information', active:true, disabled:false},
			               { title:'Data File Information', active:false, disabled:true},
			               { title:'Excel Information', active:false, disabled:true},
			               { title:'Data Mapping Information', active:false, disabled:true}
			             ];*/
			//$scope.showProfileBasic=false;
			$scope.mp = {disablePrevious:false};
			$scope.showOther = false;
			
			$scope.textQualifiers = [{name:'"'},{name:"'"},{name:'NONE'}];
			//$scope.selectTextQualifierModel = {currentTextQualifier:null};
			$scope.dataFileLevel = {value:null};
			
			$scope.headers = [];
			$scope.selectHeaderModel = {currentHeader:null};
			$scope.fund = {fundId:null};
			
			$scope.dataHeader = {value:null};
			
			$scope.worksheets = [];
			$scope.selectWorksheetModel = {currentWorksheet:null};
			$scope.definedNames = [];
			$scope.selectDefinedNameModel = {currentDefinedName:null};
			$scope.selectOrientationModel = {currentOrientation:null};
			
			$scope.mappingBlocks = [];
			$scope.selectFirstMappingBlockModel = {dataSource:null, cells:null};
			$scope.selectMappingBlockModel = [{dataSource:null, cells:null}];
			$scope.excelCells = [];
			$scope.cell = null;
		};
	};
	
	// Mains
	var qppUserName = $location.search().qppUserName;
	if((null== qppUserName || ''== qppUserName) && null == $rootScope.qppsessionid) {
		 $location.path("/login");
		 var urlParts = document.location.href.split("/");
     	 window.location = "/" + urlParts[3] + "/#/login";
     	$rootScope.nav = "manageProfile";
     	 //return;
	} else {
		if(null == $rootScope.qppsessionid) {
			$scope.error = [{show:false}, {message:''}];
			// Get user session when qppUserName is found
			$http.get('autoqpplogin?qppUserName='+qppUserName)
				.then(function(response){
				if(''==response.data) {
					$scope.error.show = true;
					$scope.error.message = 'Auto authentication of the user failed';
					
					$location.path("/login");
					var urlParts = document.location.href.split("/");
					window.location = "/" + urlParts[3] + "/#/login";
					$rootScope.nav = "manageProfile";
					//return;
				} else {
					$rootScope.authenticated = true;
					$rootScope.qppsessionid = response.data.sessionId;
					$scope.manageProfileLogic();
				}
			});	
		} else {
			$scope.manageProfileLogic();
		}
	}
	$("#tabArea2").hide();
	$("#tabArea3").hide();
	$("#tabArea4").hide();
 }]);


controllers.controller('StartController', ['$rootScope','$scope', '$uibModal', '$log',
                                             function ($rootScope, $scope, $uibModal, $log) {

	  $scope.open = function (size) {

		    var modalInstance = $uibModal.open({
		      animation: $scope.animationsEnabled,
		      templateUrl: 'manageProfile/manageProfile.html',
		      controller: 'ProfileController',
		      size: size,
		      resolve: {
		        items: function () {
		          return $scope.items;
		        }
		      }
		    });

		    modalInstance.result.then(function (selectedItem) {
		      $scope.selected = selectedItem;
		    }, function () {
		      $log.info('Modal dismissed at: ' + new Date());
		    });
		  };
	
}]);








