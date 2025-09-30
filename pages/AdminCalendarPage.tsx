import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { CalendarEvent, CalendarEventType, NotificationType, AdminPermission, TransactionType, TransactionStatus, AuditDetail } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, CALENDAR_EVENT_TYPE_COLORS } from '../constants';
import { formatDate, generateId, generateAuditDetails } from '../utils/helpers';
import { CalendarDaysIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/ui/Icons';

const AdminCalendarPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, addTransaction, exportData } = useData(); // Raw DataContext methods
  const { addNotification } = useNotifications();
  
  // Local state for DataContext methods regarding calendarEvents specifically
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (appData?.calendarEvents) {
      setCalendarEvents(appData.calendarEvents);
    }
  }, [appData?.calendarEvents]);


  const addCalendarEventToState = useCallback((eventData: Omit<CalendarEvent, 'id'>): CalendarEvent | null => {
    if (!adminUser) return null;
    const newEvent: CalendarEvent = {
        ...eventData,
        id: generateId('calevent'),
        createdAt: new Date().toISOString(),
        createdByAdminId: adminUser.id,
    };
    const updatedEvents = [newEvent, ...calendarEvents];
    setCalendarEvents(updatedEvents);
    exportData('calendarEvents', updatedEvents);
    addTransaction({
        adminId: adminUser.id,
        type: TransactionType.CALENDAR_EVENT_CREATED,
        status: TransactionStatus.COMPLETED,
        description: `Eveniment nou creat în calendar: "${newEvent.title}"`,
        details: { eventId: newEvent.id, initialValues: { title: newEvent.title, date: newEvent.date, eventType: newEvent.type, description: newEvent.description } }
    });
    return newEvent;
  }, [adminUser, calendarEvents, exportData, addTransaction]);

  const updateCalendarEventInState = useCallback((oldEvent:CalendarEvent, updatedEventData: Partial<Omit<CalendarEvent, 'id' | 'createdByAdminId' | 'createdAt'>>): CalendarEvent | null => {
    if(!adminUser) return null;
    
    const updatedEvent: CalendarEvent = { ...oldEvent, ...updatedEventData };
    const updatedEvents = calendarEvents.map(event => event.id === updatedEvent.id ? updatedEvent : event);
    setCalendarEvents(updatedEvents);
    exportData('calendarEvents', updatedEvents);

    const changes = generateAuditDetails(
        oldEvent, 
        updatedEvent, 
        ['title', 'date', 'type', 'description'],
        { title: "Titlu", date: "Data", type: "Tip Eveniment", description: "Descriere" }
    );

     addTransaction({
        adminId: adminUser.id,
        type: TransactionType.CALENDAR_EVENT_UPDATED,
        status: TransactionStatus.COMPLETED,
        description: `Eveniment din calendar actualizat: "${updatedEvent.title}"`,
        details: { eventId: updatedEvent.id, changedFields: changes }
    });
    return updatedEvent;
  }, [adminUser, calendarEvents, exportData, addTransaction]);

  const deleteCalendarEventFromState = useCallback((eventId: string): boolean => {
    if(!adminUser) return false;
    const eventToDelete = calendarEvents.find(e => e.id === eventId);
    if (!eventToDelete) return false;

    const updatedEvents = calendarEvents.filter(event => event.id !== eventId);
    setCalendarEvents(updatedEvents);
    exportData('calendarEvents', updatedEvents);
    addTransaction({
        adminId: adminUser.id,
        type: TransactionType.CALENDAR_EVENT_DELETED,
        status: TransactionStatus.COMPLETED,
        description: `Eveniment șters din calendar: "${eventToDelete.title}"`,
        details: { eventId: eventToDelete.id, deletedValues: { title: eventToDelete.title, date: eventToDelete.date, type: eventToDelete.type } }
    });
    return true;
  }, [adminUser, calendarEvents, exportData, addTransaction]);


  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventDateForModal, setEventDateForModal] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const initialEventFormData = {
    title: '',
    type: CalendarEventType.OTHER,
    description: '',
  };
  const [eventFormData, setEventFormData] = useState<{
    title: string;
    type: CalendarEventType;
    description?: string;
  }>(initialEventFormData);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  
  const canManageCalendar = adminUser?.isGlobalAdmin || adminUser?.adminPermissions?.[AdminPermission.CAN_MANAGE_CALENDAR_EVENTS];

  useEffect(() => {
    if (editingEvent) {
      setEventFormData({
        title: editingEvent.title,
        type: editingEvent.type,
        description: editingEvent.description || '',
      });
      setEventDateForModal(editingEvent.date);
    } else {
      setEventFormData(initialEventFormData);
      // eventDateForModal is set when opening modal for new event via day click or default to today
    }
  }, [editingEvent, isModalOpen]);


  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    // Corrected logic for next month
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1); // Increment month
    }
  };
  
  const openEventModal = (event?: CalendarEvent, dateStr?: string) => {
    if (!canManageCalendar) {
        addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
        return;
    }
    setEditingEvent(event || null);
    setEventDateForModal(dateStr || event?.date || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };
  
  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCalendar || !adminUser) return;

    if (!eventFormData.title.trim()) {
      addNotification("Titlul evenimentului este obligatoriu.", NotificationType.ERROR);
      return;
    }
    
    const payloadForUpdate: Partial<Omit<CalendarEvent, 'id' | 'createdByAdminId' | 'createdAt'>> = {
        title: eventFormData.title,
        date: eventDateForModal,
        type: eventFormData.type,
        description: eventFormData.description,
    };
    
    const payloadForCreate: Omit<CalendarEvent, 'id'> = {
        title: eventFormData.title,
        date: eventDateForModal,
        type: eventFormData.type,
        description: eventFormData.description,
        createdByAdminId: adminUser.id, // Will be set in addCalendarEventToState
        createdAt: new Date().toISOString(), // Will be set in addCalendarEventToState
    };


    if (editingEvent) {
      updateCalendarEventInState(editingEvent, payloadForUpdate);
      addNotification(UI_TEXT_ROMANIAN.eventUpdatedSuccessfully, NotificationType.SUCCESS);
    } else {
      addCalendarEventToState(payloadForCreate);
      addNotification(UI_TEXT_ROMANIAN.eventCreatedSuccessfully, NotificationType.SUCCESS);
    }
    setIsModalOpen(false);
  };

  const openDeleteConfirm = (event: CalendarEvent) => {
    if (!canManageCalendar) return;
    setEventToDelete(event);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = () => {
    if (eventToDelete && canManageCalendar) {
      deleteCalendarEventFromState(eventToDelete.id);
      addNotification(UI_TEXT_ROMANIAN.eventDeletedSuccessfully, NotificationType.SUCCESS);
    }
    setIsDeleteConfirmOpen(false);
    setEventToDelete(null);
  };
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun, 1=Mon, ...
  const adjustedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; // Adjust to 0=Mon, ..., 6=Sun

  const calendarGrid: (Date | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) { calendarGrid.push(null); } // Prev month placeholder days
  for (let i = 1; i <= daysInMonth; i++) { calendarGrid.push(new Date(currentYear, currentMonth, i)); }
  const remainingCells = 7 - (calendarGrid.length % 7);
  if (remainingCells < 7) { for (let i = 0; i < remainingCells; i++) { calendarGrid.push(null); } }


  if (loading || !appData || !adminUser) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  if (!canManageCalendar) {
    return (
        <Card title={UI_TEXT_ROMANIAN.accessDenied} className="text-center">
            <p>{UI_TEXT_ROMANIAN.accessDenied} Nu aveți permisiunea de a gestiona calendarul.</p>
        </Card>
    );
  }
  
  const monthEvents = calendarEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
          <CalendarDaysIcon className="h-8 w-8 mr-3 text-primary-500" />
          {UI_TEXT_ROMANIAN.adminCalendarTitle}
        </h1>
        {canManageCalendar && (
            <Button onClick={() => openEventModal()} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5" />}>
                {UI_TEXT_ROMANIAN.addNewEvent}
            </Button>
        )}
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <Button onClick={handlePrevMonth} variant="outline" size="sm" leftIcon={<ChevronLeftIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.previousMonth}</Button>
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">
            {new Date(currentYear, currentMonth).toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}
          </h2>
          <Button onClick={handleNextMonth} variant="outline" size="sm" rightIcon={<ChevronRightIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.nextMonth}</Button>
        </div>

        <div className="grid grid-cols-7 gap-px border border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden">
          {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800">{day}</div>
          ))}
          {calendarGrid.map((date, index) => {
            const dayKey = date ? date.toISOString().split('T')[0] : `empty-${index}`;
            const eventsOnThisDay = date ? monthEvents.filter(e => e.date === date.toISOString().split('T')[0]) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={dayKey} 
                className={`p-1.5 h-32 flex flex-col bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${!date ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                onClick={date && canManageCalendar ? () => openEventModal(undefined, date.toISOString().split('T')[0]) : undefined}
                role={date && canManageCalendar ? "button" : undefined}
                tabIndex={date && canManageCalendar ? 0 : -1}
                aria-label={date ? `Adaugă eveniment pentru ${formatDate(date, {day: 'numeric', month:'long'})}` : 'Zi inactivă'}
              >
                {date && <span className={`text-xs font-semibold ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-200'}`}>{date.getDate()}</span>}
                <div className="mt-1 space-y-0.5 overflow-y-auto text-xs flex-grow">
                  {eventsOnThisDay.slice(0, 2).map(event => (
                    <div 
                        key={event.id} 
                        className={`p-1 rounded text-xs truncate ${CALENDAR_EVENT_TYPE_COLORS[event.type]?.bg || CALENDAR_EVENT_TYPE_COLORS.OTHER.bg} ${CALENDAR_EVENT_TYPE_COLORS[event.type]?.text || CALENDAR_EVENT_TYPE_COLORS.OTHER.text} cursor-pointer`}
                        onClick={(e) => { e.stopPropagation(); if(canManageCalendar) openEventModal(event); }}
                        title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {eventsOnThisDay.length > 2 && (
                     <div className="p-1 text-neutral-500 dark:text-neutral-400 text-center text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); /* Implement view all events for day modal if needed */ }}>
                        + {eventsOnThisDay.length - 2} altele
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {monthEvents.length === 0 && <p className="text-center py-6 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noEventsThisMonth}</p>}
      </Card>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingEvent ? UI_TEXT_ROMANIAN.editEvent : UI_TEXT_ROMANIAN.addNewEvent}
        >
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <Input label={UI_TEXT_ROMANIAN.eventTitleLabel} name="title" value={eventFormData.title} onChange={handleEventFormChange} required />
            <Input label={UI_TEXT_ROMANIAN.eventDateLabel} type="date" name="date" value={eventDateForModal} onChange={(e) => setEventDateForModal(e.target.value)} required />
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.eventTypeLabel}</label>
              <select 
                id="type" name="type" 
                value={eventFormData.type} 
                onChange={handleEventFormChange} 
                className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={CalendarEventType.SPORT_EVENT}>{UI_TEXT_ROMANIAN.eventTypeSport}</option>
                <option value={CalendarEventType.MAINTENANCE}>{UI_TEXT_ROMANIAN.eventTypeMaintenance}</option>
                <option value={CalendarEventType.ADMIN_REMINDER}>{UI_TEXT_ROMANIAN.eventTypeAdminReminder}</option>
                <option value={CalendarEventType.OTHER}>{UI_TEXT_ROMANIAN.eventTypeOther}</option>
              </select>
            </div>
            <Textarea label={UI_TEXT_ROMANIAN.eventDescriptionLabel} name="description" value={eventFormData.description || ''} onChange={handleEventFormChange} rows={3} />
            <div className="flex justify-end space-x-3 pt-2">
              {editingEvent && (
                <Button variant="danger" type="button" onClick={() => openDeleteConfirm(editingEvent)} leftIcon={<TrashIcon className="h-5 w-5"/>}>
                  {UI_TEXT_ROMANIAN.delete}
                </Button>
              )}
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{UI_TEXT_ROMANIAN.cancel}</Button>
              <Button variant="primary" type="submit">{UI_TEXT_ROMANIAN.save}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteConfirmOpen && eventToDelete && (
        <ConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={confirmDeleteEvent}
          title={UI_TEXT_ROMANIAN.confirmEventDeletionTitle}
          message={UI_TEXT_ROMANIAN.confirmEventDeletionMessage.replace('{eventTitle}', eventToDelete.title)}
          confirmText={UI_TEXT_ROMANIAN.delete}
        />
      )}
    </div>
  );
};

export default AdminCalendarPage;