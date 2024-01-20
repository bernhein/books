# Copyright (c) 2024, Bernhard Hein and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document
# from frappe import _

class StartbetragItem(Document):
	pass

@frappe.whitelist()
def get_startbetrag_items(parent_name):
    if not frappe.db.exists('Monat', parent_name):
        return []
    startbetrag_items = frappe.get_all('Startbetrag Item',
                                   fields=['heigh', 'kategorie'],
                                   filters={'parent': parent_name, 'parentfield': 'tbl_startbetrag'})
    return startbetrag_items