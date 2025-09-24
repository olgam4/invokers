/**
 * @file data.ts
 * @summary Data Management Command Pack for the Invokers library.
 * @description
 * This module provides commands for sophisticated data manipulation including
 * array operations, context management, and reactive data binding. These commands
 * are especially powerful when combined with the advanced templating system.
 * 
 * @example
 * ```javascript
 * import { registerDataCommands } from 'invokers/commands/data';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerDataCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, isInterpolationEnabled } from '../index';
import { interpolateString } from '../advanced/interpolation';

/**
 * Data manipulation commands for complex data operations and state management.
 * Includes array manipulation, data binding, and reactive data operations.
 */
const dataCommands: Record<string, CommandCallback> = {

  // --- Basic Data Commands ---

  /**
   * `--data:set`: Sets a data attribute on the target element.
   * @example `<button command="--data:set:userId:123" commandfor="#profile">Set User ID</button>`
   */
  "--data:set": ({ invoker, targetElement, params }: CommandContext) => {
    const key = params[0];
    let value = params[1];
    if (!key) {
      throw createInvokerError('Data set command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--data:set', element: invoker
      });
    }

    // Interpolate value if interpolation is enabled
    if (isInterpolationEnabled() && value) {
      const context = {
        this: {
          ...invoker,
          dataset: { ...invoker.dataset },
          value: (invoker as any).value || '',
        },
        data: document.body.dataset,
        event: (invoker as any).triggeringEvent,
      };
      value = interpolateString(value, context);
    }

    targetElement.dataset[key] = value || '';
  },

  /**
   * `--data:copy`: Copies a data attribute from a source element to the target.
   * @example `<button command="--data:copy:userId" commandfor="#edit-form" data-copy-from="#user-profile">Edit User</button>`
   */
  "--data:copy": ({ invoker, targetElement, params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('Data copy command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--data:copy', element: invoker
      });
    }

    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement: HTMLElement | null = invoker;

    if (sourceSelector) {
      sourceElement = document.querySelector(sourceSelector);
      if (!sourceElement) {
        throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, ErrorSeverity.ERROR, {
          command: '--data:copy', element: invoker
        });
      }
    }

    const value = sourceElement.dataset[key];
    if (value !== undefined) {
      targetElement.dataset[key] = value;
    }
  },

  // --- Array Manipulation Commands ---

  /**
   * `--data:set:array:push`: Adds an item to the end of an array stored in a data attribute.
   * @example `<button command="--data:set:array:push:todos" data-value='{"title": "New Task"}' commandfor="#app">Add Todo</button>`
   */
  "--data:set:array:push": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array push command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }

    const valueToAdd = invoker.dataset.value;
    if (!valueToAdd) {
      throw createInvokerError('Array push command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    try {
      const newItem = JSON.parse(valueToAdd);
      arrayData.push(newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }
  },

  /**
   * `--data:set:array:remove`: Removes an item at a specific index from an array stored in a data attribute.
   * @example `<button command="--data:set:array:remove:todos" data-index="2" commandfor="#app">Remove Item</button>`
   */
  "--data:set:array:remove": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array remove command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:remove', element: invoker
      });
    }

    const indexToRemove = parseInt(invoker.dataset.index || '0', 10);
    if (isNaN(indexToRemove)) {
      throw createInvokerError('Array remove command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:remove', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (indexToRemove >= 0 && indexToRemove < arrayData.length) {
      arrayData.splice(indexToRemove, 1);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    }
  },

  /**
   * `--data:set:array:update`: Updates an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:update:todos" data-index="1" data-value='{"title": "Updated"}' commandfor="#app">Update Item</button>`
   */
  "--data:set:array:update": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array update command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    const indexToUpdate = parseInt(invoker.dataset.index || '0', 10);
    const valueToUpdate = invoker.dataset.value;

    if (isNaN(indexToUpdate)) {
      throw createInvokerError('Array update command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    if (!valueToUpdate) {
      throw createInvokerError('Array update command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (indexToUpdate >= 0 && indexToUpdate < arrayData.length) {
      try {
        const updateData = JSON.parse(valueToUpdate);
        arrayData[indexToUpdate] = { ...arrayData[indexToUpdate], ...updateData };
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:update', element: invoker
        });
      }
    }
  },

  /**
   * `--data:set:array:insert`: Inserts an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:insert:todos" data-index="1" data-value='{"title": "Inserted Item"}' commandfor="#app">Insert at Position 1</button>`
   */
  "--data:set:array:insert": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array insert command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    const indexToInsert = parseInt(invoker.dataset.index || '0', 10);
    const valueToInsert = invoker.dataset.value;

    if (isNaN(indexToInsert)) {
      throw createInvokerError('Array insert command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    if (!valueToInsert) {
      throw createInvokerError('Array insert command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    try {
      const newItem = JSON.parse(valueToInsert);
      arrayData.splice(indexToInsert, 0, newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }
  },

  /**
   * `--data:set:array:sort`: Sorts an array stored in a data attribute by a specified property.
   * @example `<button command="--data:set:array:sort:todos" data-sort-by="title" data-sort-order="asc" commandfor="#app">Sort by Title</button>`
   */
  "--data:set:array:sort": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array sort command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:sort', element: invoker
      });
    }

    const sortBy = invoker.dataset.sortBy || invoker.dataset.sort_by;
    const sortOrder = invoker.dataset.sortOrder || invoker.dataset.sort_order || 'asc';

    if (!sortBy) {
      throw createInvokerError('Array sort command requires a data-sort-by attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:sort', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    arrayData.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
  },

  /**
   * `--data:set:array:filter`: Filters an array stored in a data attribute and stores the result in a new key.
   * @example `<button command="--data:set:array:filter:todos" data-filter-by="completed" data-filter-value="false" data-result-key="filtered-todos" commandfor="#app">Show Pending</button>`
   */
  "--data:set:array:filter": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array filter command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:filter', element: invoker
      });
    }

    const filterBy = invoker.dataset.filterBy || invoker.dataset.filter_by;
    const filterValue = invoker.dataset.filterValue || invoker.dataset.filter_value;
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-filtered`;

    if (!filterBy) {
      throw createInvokerError('Array filter command requires a data-filter-by attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:filter', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    const filteredData = arrayData.filter(item => {
      const itemValue = item[filterBy];
      if (filterValue === 'true') return itemValue === true;
      if (filterValue === 'false') return itemValue === false;
      return String(itemValue) === filterValue;
    });

    targetElement.dataset[resultKey] = JSON.stringify(filteredData);
  },

  // --- Application-Specific Todo Commands ---
  // These are specialized commands that could be extracted to a separate module in the future

  /**
   * `--data:set:new-todo`: Adds a new todo item to the todos array.
   * @example `<form command="--data:set:new-todo" data-bind-to="#form-data" data-bind-as="data:new-todo-json">`
   */
  "--data:set:new-todo": ({ invoker, targetElement }: CommandContext) => {
    // Get the form data
    const formData = getFormData(invoker as unknown as HTMLFormElement);

    // Generate unique ID and add metadata
    const newTodo = {
      id: generateId(),
      title: formData.title || '',
      description: formData.description || '',
      priority: formData.priority || 'medium',
      tags: formData.tags || '',
      completed: false,
      created: new Date().toLocaleDateString()
    };

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    todos.push(newTodo);
    targetElement.dataset.todos = JSON.stringify(todos);

    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:toggle`: Toggles the completed status of a todo item.
   * @example `<input command="--data:set:toggle:123" data-bind-to="body" data-bind-as="data:toggle-item">`
   */
  "--data:set:toggle": ({ invoker, targetElement, params }: CommandContext) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError('Toggle command requires a todo ID parameter', ErrorSeverity.ERROR, {
        command: '--data:set:toggle', element: invoker
      });
    }

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex !== -1) {
      todos[todoIndex].completed = !todos[todoIndex].completed;
      targetElement.dataset.todos = JSON.stringify(todos);
      // Dispatch event for UI updates
      targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
    }
  },

  /**
   * `--data:set:delete`: Deletes a todo item.
   * @example `<button command="--data:set:delete:123" data-bind-to="body" data-bind-as="data:delete-item">`
   */
  "--data:set:delete": ({ invoker, targetElement, params }: CommandContext) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError('Delete command requires a todo ID parameter', ErrorSeverity.ERROR, {
        command: '--data:set:delete', element: invoker
      });
    }

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const filteredTodos = todos.filter(t => t.id !== todoId);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:complete-all`: Marks all pending todos as completed.
   * @example `<button command="--data:set:bulk-action:complete-all" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:complete-all": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const updatedTodos = todos.map(todo =>
      todo.completed ? todo : { ...todo, completed: true }
    );

    targetElement.dataset.todos = JSON.stringify(updatedTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:clear-completed`: Removes all completed todos.
   * @example `<button command="--data:set:bulk-action:clear-completed" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:clear-completed": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const filteredTodos = todos.filter(todo => !todo.completed);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:export`: Exports todos as JSON.
   * @example `<button command="--data:set:bulk-action:export" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:export": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// --- Helper Functions ---

function getFormData(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  const data: Record<string, string> = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value.toString();
  }
  
  return data;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Registers all data manipulation and array operation commands with the InvokerManager.
 * This includes basic data operations, array manipulation, and reactive data binding.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerDataCommands } from 'invokers/commands/data';
 * import invokerManager from 'invokers';
 * 
 * registerDataCommands(invokerManager);
 * ```
 */
export function registerDataCommands(manager: InvokerManager): void {
  for (const name in dataCommands) {
    if (dataCommands.hasOwnProperty(name)) {
      manager.register(name, dataCommands[name]);
    }
  }
}
