import React, { useState, useEffect } from 'react';
import { UI_TEXT_ROMANIAN } from '../../constants';
import Button from './Button';
import Input from './Input';
import Card from './Card'; // Added import for Card component

export type DateRangeType = 'last7days' | 'last30days' | 'currentMonth' | 'currentYear' | 'all' | 'custom';

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

interface DateRangeFilterProps {
  onRangeChange: (range: DateRange) => void;
  initialRangeType?: DateRangeType;
}

const getIsoDateString = (date: Date): string => date.toISOString().split('T')[0];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onRangeChange, initialRangeType = 'last30days' }) => {
  const [selectedRangeType, setSelectedRangeType] = useState<DateRangeType>(initialRangeType);
  const [customStartDate, setCustomStartDate] = useState<string>(getIsoDateString(new Date()));
  const [customEndDate, setCustomEndDate] = useState<string>(getIsoDateString(new Date()));

  useEffect(() => {
    // Set initial range on mount
    handleRangeTypeChange(initialRangeType, getIsoDateString(new Date()), getIsoDateString(new Date()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRangeType]);


  const calculateRange = (type: DateRangeType, customStart?: string, customEnd?: string): DateRange => {
    const today = new Date();
    switch (type) {
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // Inclusive of today
        return { startDate: getIsoDateString(sevenDaysAgo), endDate: getIsoDateString(today) };
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29); // Inclusive of today
        return { startDate: getIsoDateString(thirtyDaysAgo), endDate: getIsoDateString(today) };
      case 'currentMonth':
        const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: getIsoDateString(firstDayMonth), endDate: getIsoDateString(lastDayMonth) };
      case 'currentYear':
        const firstDayYear = new Date(today.getFullYear(), 0, 1);
        const lastDayYear = new Date(today.getFullYear(), 11, 31);
        return { startDate: getIsoDateString(firstDayYear), endDate: getIsoDateString(lastDayYear) };
      case 'all':
        return { startDate: null, endDate: null }; // Signifies all time
      case 'custom':
        return { startDate: customStart || '', endDate: customEnd || '' };
      default:
        return { startDate: null, endDate: null };
    }
  };

  const handleRangeTypeChange = (type: DateRangeType, csd?: string, ced?: string) => {
    setSelectedRangeType(type);
    if (type !== 'custom') {
      onRangeChange(calculateRange(type));
    } else if (csd && ced) { // For initial custom load or direct call
        onRangeChange(calculateRange(type, csd, ced));
    }
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
        if (new Date(customStartDate) > new Date(customEndDate)) {
            // Basic validation, could be expanded with notifications
            alert(UI_TEXT_ROMANIAN.invalidDateRange);
            return;
        }
        onRangeChange(calculateRange('custom', customStartDate, customEndDate));
    }
  };


  return (
    <Card title={UI_TEXT_ROMANIAN.filterByDateRange} className="mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-grow">
          <label htmlFor="rangeTypeSelect" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {UI_TEXT_ROMANIAN.selectPeriod}
          </label>
          <select
            id="rangeTypeSelect"
            value={selectedRangeType}
            onChange={(e) => handleRangeTypeChange(e.target.value as DateRangeType, customStartDate, customEndDate)}
            className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="last7days">{UI_TEXT_ROMANIAN.last7Days}</option>
            <option value="last30days">{UI_TEXT_ROMANIAN.last30Days}</option>
            <option value="currentMonth">{UI_TEXT_ROMANIAN.currentMonth}</option>
            <option value="currentYear">{UI_TEXT_ROMANIAN.currentYear}</option>
            <option value="all">{UI_TEXT_ROMANIAN.allTime}</option>
            <option value="custom">{UI_TEXT_ROMANIAN.customRange}</option>
          </select>
        </div>

        {selectedRangeType === 'custom' && (
          <>
            <Input
              type="date"
              label={UI_TEXT_ROMANIAN.startDate}
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              containerClassName="mb-0 flex-grow"
              className="py-2.5"
            />
            <Input
              type="date"
              label={UI_TEXT_ROMANIAN.endDate}
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              containerClassName="mb-0 flex-grow"
              className="py-2.5"
            />
            <Button onClick={handleCustomDateChange} variant="primary" className="h-[46px] sm:self-end">
              {UI_TEXT_ROMANIAN.applyFilter}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default DateRangeFilter;