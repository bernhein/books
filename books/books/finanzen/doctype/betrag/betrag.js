// Copyright (c) 2023, Bernhard Hein and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Betrag", {
// 	refresh(frm) {

// 	},
// });


betrag = undefined;
kategorie = undefined;
datum = undefined;
budget_list = undefined;
gesamtbudgetIsUpdated = false;


/*
function updateGesamtBudget(frm, cdt, cdn){
    gesamtbudgetIsUpdated = false;
    frappe.db.get_value('Kategorie', frm.fields_dict.kategorie.value, 'budget_high').then((res) => {
        frm.set_value('gesamt_budget', res.message.budget_high);
        gesamtbudgetIsUpdated = true;
        updateRestBudget(frm,cdt,cdn);
        console.log(dbGesBudget);
    });
    
    
    

    
}

function updateRestBudget(frm,cdt,cdn){
    if (kategorie !== undefined) {
        //frappe.msgprint('A row has been added to the links table 🎉 ');

        //# Todo: Budget filtern
        //# Todo: Monat filtern
        //# Todo: Feld richtig updaten

        var restbudget = 0;

        if (betrag !== undefined) {
            restbudget = frm.fields_dict.gesamt_budget.value - frm.fields_dict.betrag.value;
            frm.set_value('restbudget', restbudget);
        } else {
            restbudget = frm.fields_dict.gesamt_budget.value;
            frm.set_value('restbudget', restbudget);
        }

        if (datum !== undefined) {
            budget_list = frappe.db.get_list('Betrag',{
                fields:['name','betrag', 'datum'],
                filters:[[
                    'datum', 'between', ['2023-12-01', '2023-12-31']
                ]]
                }
            ).then((res) => {
                res.forEach((bet) => {
                    restbudget -= bet.betrag;
                    console.log(bet);
                });
                frm.set_value('restbudget', restbudget);
                //frm.fields_dict.restbudget.value = restbudget;
                
                if (restbudget < 0) {
                    frappe.msgprint('Budget überschritten!');
                }
            });
        }
        
    }
}


frappe.ui.form.on('Betrag', { // The child table is defined in a DoctType called "Dynamic Link"
    betrag(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        // frm: current ToDo form
        // cdt: child DocType 'Dynamic Link'
        // cdn: child docname (something like 'a6dfk76')
        // cdt and cdn are useful for identifying which row triggered this event
        
        betrag = frm.fields_dict.betrag.value;
        
        updateRestBudget(frm, cdt, cdn);
    },
    kategorie(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        
        kategorie = frm.fields_dict.kategorie.value;
        
        updateGesamtBudget(frm, cdt, cdn);
        //updateRestBudget(frm, cdt, cdn);

    },
    datum(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        
        datum = frm.fields_dict.datum.value;
        
        updateRestBudget(frm, cdt, cdn);
    }
});

*/