"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useActivitiesPanel = useActivitiesPanel;
var react_1 = require("react");
var dateUtils_1 = require("../../../utils/date/dateUtils");
function useActivitiesPanel(_a) {
    var activityRows = _a.activityRows;
    var _b = (0, react_1.useState)(true), showTodayActivities = _b[0], setShowTodayActivities = _b[1];
    var todayDateValue = (0, dateUtils_1.toDateInputValue)(new Date());
    var filteredActivities = showTodayActivities
        ? activityRows.filter(function (row) { return (0, dateUtils_1.isSameDate)(row.start_time, todayDateValue); })
        : activityRows;
    return {
        showTodayActivities: showTodayActivities,
        setShowTodayActivities: setShowTodayActivities,
        filteredActivities: filteredActivities
    };
}
