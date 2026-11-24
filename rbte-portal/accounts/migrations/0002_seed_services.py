from django.db import migrations


def seed(apps, schema_editor):
    Service = apps.get_model("accounts", "Service")
    for name, description, url, order in [
        ("Симулятор производства", "Планирование, расчёт производственных сценариев и анализ загрузки.", "https://simulator.rbte.pro/", 10),
        ("Пилот RBTE", "Рабочие инструменты и материалы пилотного проекта.", "https://pilot.rbte.pro/", 20),
    ]:
        Service.objects.get_or_create(url=url, defaults={"name": name, "description": description, "order": order})


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
