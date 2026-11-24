from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_seed_services")]
    operations = [migrations.CreateModel(
        name="SimulatorGrant",
        fields=[
            ("code_hash", models.CharField(max_length=64, primary_key=True, serialize=False)),
            ("challenge", models.CharField(max_length=64)),
            ("session_key", models.CharField(max_length=40)),
            ("code_expires_at", models.DateTimeField()),
            ("expires_at", models.DateTimeField(db_index=True)),
            ("grant_hash", models.CharField(max_length=64, unique=True, null=True)),
        ],
    )]
